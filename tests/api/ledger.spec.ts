import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as crypto from "crypto";

async function sendWebhookInteractive(request: any, from: string, interactiveId: string) {
  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from,
                    type: "interactive",
                    interactive: {
                      button_reply: {
                        id: interactiveId,
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
  expect(webhookRes.status()).toBe(200);
}

async function sendWebhookText(request: any, from: string, text: string) {
  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from,
                    type: "text",
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
  expect(webhookRes.status()).toBe(200);
}

test.describe("Dakshina Ledger Corroboration E2E Flow", () => {
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

  test("should successfully claim and corroborate payments with ownership validation", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const unauthorizedPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = crypto.randomUUID();
    const yajmanId = crypto.randomUUID();
    const ledgerId = crypto.randomUUID();

    // 1. Seed data
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Test Purohit', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'test@upi', 'purnimanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Test Family', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    await client.query(
      `INSERT INTO ledger (id, purohit_id, yajman_id, amount_collected, payment_status, locality_key)
       VALUES ($1, $2, $3, 1100.00, 'pending', 'varanasi')`,
      [ledgerId, purohitId, yajmanId]
    );

    // Helper to query current ledger status
    const getLedgerStatus = async () => {
      const res = await client.query("SELECT payment_status FROM ledger WHERE id = $1", [ledgerId]);
      return res.rows[0]?.payment_status;
    };

    // Assert initial state is pending
    expect(await getLedgerStatus()).toBe("pending");

    // 2. Try claim from an unauthorized phone number (ownership check)
    await sendWebhookInteractive(request, unauthorizedPhone, `ledger-claim:${ledgerId}`);
    // Wait briefly to ensure async hook has completed processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await getLedgerStatus()).toBe("pending");

    // 3. Claim from authorized Purohit number
    await sendWebhookInteractive(request, purohitPhone, `ledger-claim:${ledgerId}`);
    // Wait briefly for processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await getLedgerStatus()).toBe("claimed");

    // 4. Try confirm from unauthorized/different yajman or purohit number
    await sendWebhookInteractive(request, unauthorizedPhone, `ledger-confirm:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await getLedgerStatus()).toBe("claimed");

    // 5. Confirm from authorized Yajman number
    await sendWebhookInteractive(request, yajmanPhone, `ledger-confirm:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await getLedgerStatus()).toBe("corroborated");

    // 6. Test idempotency (double tap of confirm should do nothing and stay corroborated)
    await sendWebhookInteractive(request, yajmanPhone, `ledger-confirm:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await getLedgerStatus()).toBe("corroborated");

    // Clean up
    await client.query("DELETE FROM ledger WHERE id = $1", [ledgerId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });

  test("should support ops-inspection GET /ledger/:id with authorization checks", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = crypto.randomUUID();
    const yajmanId = crypto.randomUUID();
    const ledgerId = crypto.randomUUID();

    // 1. Seed data
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Test Purohit', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'test@upi', 'purnimanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Test Family', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    await client.query(
      `INSERT INTO ledger (id, purohit_id, yajman_id, amount_collected, payment_status, locality_key)
       VALUES ($1, $2, $3, 1500.00, 'pending', 'varanasi')`,
      [ledgerId, purohitId, yajmanId]
    );

    // 2. Query without header -> should fail with 401
    const unauthRes = await request.get(`/api/ledger/${ledgerId}`);
    expect(unauthRes.status()).toBe(401);
    const unauthData = await unauthRes.json();
    expect(unauthData.error).toBe("Unauthorized");

    // 3. Query with incorrect header -> should fail with 401
    const wrongKeyRes = await request.get(`/api/ledger/${ledgerId}`, {
      headers: {
        "X-Internal-Key": "wrong-key",
      },
    });
    expect(wrongKeyRes.status()).toBe(401);

    // 4. Query with correct header but non-existent ID -> should fail with 404
    const nonExistentId = crypto.randomUUID();
    const notFoundRes = await request.get(`/api/ledger/${nonExistentId}`, {
      headers: {
        "X-Internal-Key": process.env.INTERNAL_API_KEY || "e2e-local-key",
      },
    });
    expect(notFoundRes.status()).toBe(404);

    // 5. Query with correct header and correct ID -> should return 200 and schema params
    const authRes = await request.get(`/api/ledger/${ledgerId}`, {
      headers: {
        "X-Internal-Key": process.env.INTERNAL_API_KEY || "e2e-local-key",
      },
    });
    expect(authRes.status()).toBe(200);
    const data = await authRes.json();
    
    expect(data.id).toBe(ledgerId);
    expect(data.purohitId).toBe(purohitId);
    expect(data.yajmanId).toBe(yajmanId);
    expect(data.paymentStatus).toBe("pending");
    expect(Number(data.amountCollected)).toBe(1500.00);
    expect(data.localityKey).toBe("varanasi");
    expect(data.createdAt).toBeDefined();

    // Clean up
    await client.query("DELETE FROM ledger WHERE id = $1", [ledgerId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });

  test("should drive the full post-ritual dakshina flow via app triggers end to end, with no raw-SQL ledger seeding", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = crypto.randomUUID();
    const yajmanId = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    // 1. Seed purohit, yajman, and event via SQL -- deliberately NOT seeding any ledger row.
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Test Purohit', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'test@upi', 'purnimanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Test Family', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, label)
       VALUES ($1, $2, $3, 'shraddh', 'Chaitra', 'Shukla', 5, 'परीक्षण श्राद्ध')`,
      [eventId, yajmanId, purohitId]
    );

    const countLedgerForEvent = async () => {
      const res = await client.query("SELECT count(*) FROM ledger WHERE event_id = $1", [eventId]);
      return Number(res.rows[0]?.count ?? 0);
    };

    // 2. Purohit taps "booking-confirm" -- this must NOT create a ledger row.
    await sendWebhookInteractive(request, purohitPhone, `booking-confirm:${eventId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await countLedgerForEvent()).toBe(0);

    // 3. Purohit taps "ritual-completed" -- this creates the pending, amount-unset ledger row.
    await sendWebhookInteractive(request, purohitPhone, `ritual-completed:${eventId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const ledgerRes = await client.query(
      "SELECT id, payment_status, amount_collected FROM ledger WHERE event_id = $1",
      [eventId]
    );
    expect(ledgerRes.rows.length).toBe(1);
    expect(ledgerRes.rows[0].payment_status).toBe("pending");
    expect(ledgerRes.rows[0].amount_collected).toBeNull();
    const ledgerId = ledgerRes.rows[0].id;

    // 4. Purohit replies with the dakshina amount as free text.
    await sendWebhookText(request, purohitPhone, "1100");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const amountRes = await client.query(
      "SELECT amount_collected, payment_status FROM ledger WHERE id = $1",
      [ledgerId]
    );
    expect(Number(amountRes.rows[0].amount_collected)).toBe(1100.0);
    expect(amountRes.rows[0].payment_status).toBe("pending");

    // 5. Both parties should have received a post-ritual card with a UPI deep link.
    const outboundRes = await request.get("/api/whatsapp/outbound");
    expect(outboundRes.status()).toBe(200);
    const outbound = await outboundRes.json();

    const purohitCard = outbound.find(
      (m: { to: string; text: string }) =>
        m.to === purohitPhone && m.text.includes("upi://pay") && m.text.includes(`ledger-claim:${ledgerId}`)
    );
    expect(purohitCard).toBeDefined();

    const familyCard = outbound.find(
      (m: { to: string; text: string }) =>
        m.to === yajmanPhone && m.text.includes("upi://pay") && m.text.includes(`ledger-confirm:${ledgerId}`)
    );
    expect(familyCard).toBeDefined();

    // 6. Purohit claims receipt.
    await sendWebhookInteractive(request, purohitPhone, `ledger-claim:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const claimedRes = await client.query("SELECT payment_status FROM ledger WHERE id = $1", [ledgerId]);
    expect(claimedRes.rows[0].payment_status).toBe("claimed");

    // 7. Family confirms the ritual occurred, closing the full corroboration loop.
    await sendWebhookInteractive(request, yajmanPhone, `ledger-confirm:${ledgerId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const corroboratedRes = await client.query("SELECT payment_status FROM ledger WHERE id = $1", [ledgerId]);
    expect(corroboratedRes.rows[0].payment_status).toBe("corroborated");

    // Clean up
    await client.query("DELETE FROM ledger WHERE id = $1", [ledgerId]);
    await client.query("DELETE FROM events WHERE id = $1", [eventId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });
});
