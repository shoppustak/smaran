import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as crypto from "crypto";

async function sendWebhookText(request: any, from: string, body: string) {
  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ id: `msg-${Date.now()}`, from, type: "text", text: { body } }],
              },
            },
          ],
        },
      ],
    },
  });
  expect(webhookRes.status()).toBe(200);
}

test.describe("Referral Loop & Cohort Metrics E2E", () => {
  let client: Client;
  const dbUrl = process.env.DATABASE_URL;

  test.beforeAll(async () => {
    expect(dbUrl).toBeDefined();
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  });

  test.afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  test("should handle referral loop onboarding and calculate observed-k cohort metrics", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const purohitId = crypto.randomUUID();

    // 1. Seed referrer Purohit with created_at set to exactly 1 week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const dayOfWeek = oneWeekAgo.getDay();
    const diff = oneWeekAgo.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const mondayVal = new Date(oneWeekAgo.setDate(diff));
    const year = mondayVal.getFullYear();
    const month = String(mondayVal.getMonth() + 1).padStart(2, "0");
    const date = String(mondayVal.getDate()).padStart(2, "0");
    const referrerWeekStr = `${year}-${month}-${date}`;

    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan, created_at)
       VALUES ($1, $2, 'Referrer Purohit', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'referrer@upi', 'purnimanta', 'trial', $3)`,
      [purohitId, purohitPhone, mondayVal]
    );

    // 2. Request referral card
    await sendWebhookText(request, purohitPhone, "referral");

    // Check outbound message buffer for the referral card
    const outboundRes = await request.get("/api/whatsapp/outbound");
    expect(outboundRes.status()).toBe(200);
    const outbound = await outboundRes.json();
    const referralMsg = outbound.find(
      (m: any) => m.to === purohitPhone && m.text.includes("पुरोहित आमंत्रण कार्ड")
    );
    expect(referralMsg).toBeDefined();
    expect(referralMsg.text).toContain(`invite:${purohitId}`);

    // 3. Onboard referred purohit A using invite link
    const referredPhoneA = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    await sendWebhookText(request, referredPhoneA, `invite:${purohitId}`);
    await sendWebhookText(request, referredPhoneA, "Referred Name A");
    await sendWebhookText(request, referredPhoneA, "Varanasi");
    await sendWebhookText(request, referredPhoneA, "Sadar Bazaar");
    await sendWebhookText(request, referredPhoneA, "referredA@upi");
    await sendWebhookText(request, referredPhoneA, "purnimanta");

    // 4. Onboard referred purohit B using invite link
    const referredPhoneB = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    await sendWebhookText(request, referredPhoneB, `invite:${purohitId}`);
    await sendWebhookText(request, referredPhoneB, "Referred Name B");
    await sendWebhookText(request, referredPhoneB, "Varanasi");
    await sendWebhookText(request, referredPhoneB, "Sadar Bazaar");
    await sendWebhookText(request, referredPhoneB, "referredB@upi");
    await sendWebhookText(request, referredPhoneB, "purnimanta");

    // Fetch in DB to get their IDs for cleanup
    const dbResA = await client.query("SELECT id, referred_by_purohit_id FROM purohits WHERE phone_number = $1", [referredPhoneA]);
    expect(dbResA.rows.length).toBe(1);
    const referredPurohitA = dbResA.rows[0];
    expect(referredPurohitA.referred_by_purohit_id).toBe(purohitId);

    const dbResB = await client.query("SELECT id, referred_by_purohit_id FROM purohits WHERE phone_number = $1", [referredPhoneB]);
    expect(dbResB.rows.length).toBe(1);
    const referredPurohitB = dbResB.rows[0];
    expect(referredPurohitB.referred_by_purohit_id).toBe(purohitId);

    // 5. Query cohort metrics with correct header
    const internalKey = process.env.INTERNAL_API_KEY || "e2e-local-key";
    const authRes = await request.get("/api/metrics/observed-k", {
      headers: { "X-Internal-Key": internalKey },
    });
    expect(authRes.status()).toBe(200);
    const cohorts = await authRes.json();

    // Find the cohort that matches the referrer's signup week
    const targetCohort = cohorts.find((c: any) => c.week === referrerWeekStr);
    expect(targetCohort).toBeDefined();
    // Denominator = size of referrer cohort (should be at least 1, the referrer)
    expect(targetCohort.cohortSize).toBeGreaterThanOrEqual(1);
    // Numerator = referred activations by members of this cohort (at least 2, Purohit A and Purohit B)
    expect(targetCohort.referredActivations).toBeGreaterThanOrEqual(2);
    // observedK = referredActivations / cohortSize = 2 / 1 = 2.0 (should be >= 2.0)
    expect(targetCohort.observedK).toBeGreaterThanOrEqual(2.0);

    // Clean up
    await client.query("DELETE FROM purohits WHERE id = $1", [referredPurohitA.id]);
    await client.query("DELETE FROM purohits WHERE id = $1", [referredPurohitB.id]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });
});
