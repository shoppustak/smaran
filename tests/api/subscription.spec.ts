import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as crypto from "crypto";
import { buildFamilyCalendarOfferCard } from "../../code/artifacts/api-server/src/lib/confirm-card";
import { postSignedWebhook, interactiveMessage } from "./helpers/webhook";

async function sendWebhookInteractive(request: any, from: string, interactiveId: string) {
  return postSignedWebhook(request, interactiveMessage(from, interactiveId, `msg-${Date.now()}`));
}

test.describe("Family Subscription E2E Flows & Isolation Gating", () => {
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

  test("should generate subscription offer card correctly", () => {
    const card = buildFamilyCalendarOfferCard("yajman-123", "Sharma Ji", "sharma@upi");
    expect(card.type).toBe("interactive");
    expect(card.interactive.type).toBe("button");
    const bodyText = (card.interactive.body as any).text;
    expect(bodyText).toContain("अपने परिवार का पंचांग");
    expect(bodyText).toContain("₹29/माह");
    expect(bodyText).toContain("Sharma Ji");
    expect(bodyText).toContain("upi://mandate");
    expect(bodyText).toContain("am=29.00");
    expect(bodyText).toContain("recur=MONTHLY");
    expect(bodyText).toContain("sharma%40upi");

    const button = (card.interactive.action as any).buttons[0];
    expect(button.reply.title).toBe("मैंने सदस्यता ले ली");
    expect(button.reply.id).toBe("subscribe-confirm:yajman-123");
  });

  test("should drive subscription offer dispatch, user activation, and lapse sweeps correctly", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const purohitId = crypto.randomUUID();
    const yajmanId = crypto.randomUUID();
    const ledgerId = crypto.randomUUID();

    // 1. Seed Purohit, Yajman and a pending ledger entry
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Sharma Ji', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'sharma@upi', 'amanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Test Family', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    await client.query(
      `INSERT INTO ledger (id, purohit_id, yajman_id, amount_collected, payment_status, locality_key)
       VALUES ($1, $2, $3, 500.00, 'pending', 'varanasi')`,
      [ledgerId, purohitId, yajmanId]
    );

    // 2. Drive the post-ritual dakshina confirmation flow to trigger the offer dispatch
    // Purohit claims
    await sendWebhookInteractive(request, purohitPhone, `ledger-claim:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // Yajman corroborates
    await sendWebhookInteractive(request, yajmanPhone, `ledger-confirm:${ledgerId}`);

    // Wait a moment for async send
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Fetch outbound messages and verify offer card was dispatched
    const outboundRes1 = await request.get("/api/whatsapp/outbound");
    expect(outboundRes1.status()).toBe(200);
    const outbound1 = await outboundRes1.json();
    console.log("Outbound messages in test:", JSON.stringify(outbound1, null, 2));
    const offerMsg = outbound1.find(
      (m: any) => m.to === yajmanPhone && m.text.includes("अपने परिवार का पंचांग")
    );
    expect(offerMsg).toBeDefined();
    expect(offerMsg.text).toContain(`subscribe-confirm:${yajmanId}`);

    // 3. User activation via button tap
    const activationWebhookRes = await sendWebhookInteractive(request, yajmanPhone, `subscribe-confirm:${yajmanId}`);
    expect(activationWebhookRes.status()).toBe(200);

    // Wait for activation to persist
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify subscription status is active in DB
    const dbRes1 = await client.query("SELECT family_sub_status, family_sub_renews_at FROM yajmans WHERE id = $1", [yajmanId]);
    expect(dbRes1.rows[0].family_sub_status).toBe("active");
    expect(dbRes1.rows[0].family_sub_renews_at).not.toBeNull();

    // 4. Test lapse recovery sweep
    // Backdate the renewal timestamp to the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    await client.query("UPDATE yajmans SET family_sub_renews_at = $1 WHERE id = $2", [pastDate, yajmanId]);

    // Trigger sweep cron
    const cronSecret = process.env.CRON_SECRET || "e2e-cron-secret";
    const sweepRes = await request.post("/api/cron/subscription-sweep", {
      headers: { "x-cron-secret": cronSecret },
    });
    expect(sweepRes.status()).toBe(200);

    // Wait for sweep to persist
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify subscription status is now lapsed in DB
    const dbRes2 = await client.query("SELECT family_sub_status FROM yajmans WHERE id = $1", [yajmanId]);
    expect(dbRes2.rows[0].family_sub_status).toBe("lapsed");

    // Verify template renewal nudge was sent
    const outboundRes2 = await request.get("/api/whatsapp/outbound");
    const outbound2 = await outboundRes2.json();
    const nudgeMsg = outbound2.find(
      (m: any) => m.to === yajmanPhone && m.text.includes("[Template: smaran_renewal_nudge]")
    );
    expect(nudgeMsg).toBeDefined();

    // Clean up
    await client.query("DELETE FROM ledger WHERE id = $1", [ledgerId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });

  test("should enforce strict relationship isolation checking (tenant-isolation validation)", async ({ request }) => {
    const purohitPhoneA = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhoneA = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const purohitIdA = crypto.randomUUID();
    const yajmanIdA = crypto.randomUUID();

    const purohitPhoneB = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhoneB = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const purohitIdB = crypto.randomUUID();
    const yajmanIdB = crypto.randomUUID();

    const ledgerIdB = crypto.randomUUID();

    // Seed Purohit A and Yajman A
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Sharma A', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'sharmaA@upi', 'amanta', 'trial')`,
      [purohitIdA, purohitPhoneA]
    );
    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Family A', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanIdA, purohitIdA, yajmanPhoneA]
    );

    // Seed Purohit B and Yajman B and Ledger B (owned by Purohit B)
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Sharma B', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'sharmaB@upi', 'amanta', 'trial')`,
      [purohitIdB, purohitPhoneB]
    );
    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Family B', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanIdB, purohitIdB, yajmanPhoneB]
    );
    await client.query(
      `INSERT INTO ledger (id, purohit_id, yajman_id, amount_collected, payment_status, locality_key)
       VALUES ($1, $2, $3, 1100.00, 'pending', 'varanasi')`,
      [ledgerIdB, purohitIdB, yajmanIdB]
    );

    // 1. Yajman A tries to confirm Ledger B (cross-purohit). Blocked (403).
    const res = await sendWebhookInteractive(request, yajmanPhoneA, `ledger-confirm:${ledgerIdB}`);
    expect(res.status()).toBe(403);

    // Confirm that Ledger B status remains pending
    const ledgerRes = await client.query("SELECT payment_status FROM ledger WHERE id = $1", [ledgerIdB]);
    expect(ledgerRes.rows[0].payment_status).toBe("pending");

    // 2. Yajman A tries to subscribe-confirm Yajman B.
    const subRes = await sendWebhookInteractive(request, yajmanPhoneA, `subscribe-confirm:${yajmanIdB}`);
    expect(subRes.status()).toBe(200);

    // Verify Yajman B's subscription remains 'none'
    const yajmanRes = await client.query("SELECT family_sub_status FROM yajmans WHERE id = $1", [yajmanIdB]);
    expect(yajmanRes.rows[0].family_sub_status).toBe("none");

    // Clean up
    await client.query("DELETE FROM ledger WHERE id = $1", [ledgerIdB]);
    await client.query("DELETE FROM yajmans WHERE id IN ($1, $2)", [yajmanIdA, yajmanIdB]);
    await client.query("DELETE FROM purohits WHERE id IN ($1, $2)", [purohitIdA, purohitIdB]);
  });
});
