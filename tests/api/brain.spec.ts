import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as crypto from "crypto";
import { postSignedWebhook, interactiveMessage } from "./helpers/webhook";

test.describe("Daily Brain Cron and Lapse Recovery E2E Flow", () => {
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

  test("should enforce authorization on the /cron/daily-brain endpoint", async ({ request }) => {
    // Missing header
    const noSecretRes = await request.post("/api/cron/daily-brain");
    expect(noSecretRes.status()).toBe(401);

    // Incorrect header
    const wrongSecretRes = await request.post("/api/cron/daily-brain", {
      headers: {
        "x-cron-secret": "wrong-secret",
      },
    });
    expect(wrongSecretRes.status()).toBe(401);
  });

  test("should process upcoming events and dispatch lapse recovery nudges correctly", async ({ request }) => {
    // 1. Fetch current panchang values from the sandbox to align our seeded event
    const panchangRes = await request.get("/api/panchang");
    expect(panchangRes.status()).toBe(200);
    const panchang = await panchangRes.json();
    
    const mockMaas = panchang.masa.name;
    const mockPaksha = panchang.tithi.paksha;
    const mockTithi = panchang.tithi.number;

    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    // Seed phone numbers
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = crypto.randomUUID();
    const yajmanId = crypto.randomUUID();
    
    // IDs for events
    const upcomingEventId = crypto.randomUUID();
    const lapsedEventId = crypto.randomUUID();
    const lapsedEventWithBookingId = crypto.randomUUID();

    // 2. Insert test Purohit and Yajman
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Sharma', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'sharma@upi', 'amanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Tiwari', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    // 3. Seed events:
    // Event A: Upcoming ritual event (matching current panchang, lastPerformedYear = currentYear)
    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, source)
       VALUES ($1, $2, $3, 'katha', $4, $5, $6, $7, 'Annual Satyanarayan Puja', 'manual')`,
      [upcomingEventId, yajmanId, purohitId, mockMaas, mockPaksha, mockTithi, currentYear]
    );

    // Event B: Lapsed event (lastPerformedYear < currentYear, no booking)
    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, source)
       VALUES ($1, $2, $3, 'shraddh', 'Ashadha', 'Krishna', 10, $4, 'Paternal Shraddh', 'manual')`,
      [lapsedEventId, yajmanId, purohitId, prevYear]
    );

    // Event C: Lapsed event but WITH a booking/ledger entry in the current year
    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, source)
       VALUES ($1, $2, $3, 'birthday', 'Kartika', 'Shukla', 5, $4, 'Son Birthday', 'manual')`,
      [lapsedEventWithBookingId, yajmanId, purohitId, prevYear]
    );

    // Create a ledger entry (booking) for Event C in the current year
    const bookingId = crypto.randomUUID();
    await client.query(
      `INSERT INTO ledger (id, purohit_id, yajman_id, event_id, amount_collected, payment_status, locality_key, created_at)
       VALUES ($1, $2, $3, $4, 501.00, 'pending', 'varanasi', NOW())`,
      [bookingId, purohitId, yajmanId, lapsedEventWithBookingId]
    );

    // 4. Trigger the daily brain cron job
    const cronSecret = process.env.CRON_SECRET || "e2e-local-key";
    const cronRes = await request.post("/api/cron/daily-brain", {
      headers: {
        "x-cron-secret": cronSecret,
      },
    });
    expect(cronRes.status()).toBe(200);
    const cronData = await cronRes.json();
    expect(cronData.status).toBe("success");

    // Wait a brief moment to ensure any asynchronous processing resolves
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 5. Query /whatsapp/outbound messages and verify alerts
    const outboundRes = await request.get("/api/whatsapp/outbound");
    expect(outboundRes.status()).toBe(200);
    const outbound = await outboundRes.json();

    const purohitMsgs = outbound.filter((msg: any) => msg.to === purohitPhone);

    // Validate the lapse recovery nudge message
    const lapseNudge = purohitMsgs.find((m: any) => m.text.includes("बुक नहीं हुआ है"));
    expect(lapseNudge).toBeDefined();
    expect(lapseNudge.text).toContain("Tiwari");
    expect(lapseNudge.text).toContain("Sharma जी");
    expect(lapseNudge.text).toContain("lapse-engage:" + lapsedEventId);

    // Validate upcoming pre-ritual alerts:
    // Event A matches mockMaas/mockPaksha/mockTithi, which is Pausha Krishna 30.
    // The daily brain weekly horizon has 8 days (i = 0 to 7).
    // Pausha Krishna 30 matches on all 8 days.
    // Out of these 8 days, only days remaining = 2 and 7 are alerted.
    // Therefore, we expect exactly 2 alert messages for upcomingEventId.

    const alertsForA = purohitMsgs.filter(
      (m: any) => m.text.includes("booking-confirm:" + upcomingEventId) && !m.text.startsWith("[Template:")
    );
    expect(alertsForA.length).toBe(2);

    const alert2 = alertsForA.find((m: any) => m.text.includes("(शेष दिन: 2)"));
    expect(alert2).toBeDefined();
    expect(alert2!.text).toContain("पंजीरी");

    const alert7 = alertsForA.find((m: any) => m.text.includes("(शेष दिन: 7)"));
    expect(alert7).toBeDefined();
    expect(alert7!.text).toContain("पंजीरी");

    // Verify that Event C (lapsed event with booking) did not generate a nudge
    const hasBookingNudge = purohitMsgs.some((m: any) => m.text.includes(lapsedEventWithBookingId));
    expect(hasBookingNudge).toBe(false);

    // 6. Test lapse recovery webhook
    // First, verify a non-owner cannot recovery it
    const wrongWebhookRes = await postSignedWebhook(
      request,
      interactiveMessage(yajmanPhone, `lapse-engage:${lapsedEventId}`, `msg-${Date.now()}-wrong`),
    );
    expect(wrongWebhookRes.status()).toBe(200);

    const checkLapseDb1 = await client.query("SELECT * FROM lapse_recoveries WHERE event_id = $1", [lapsedEventId]);
    expect(checkLapseDb1.rowCount).toBe(1);
    expect(checkLapseDb1.rows[0].recovered_at).toBeNull();

    // Then, verify the owner purohit can recover it
    const webhookRes = await postSignedWebhook(
      request,
      interactiveMessage(purohitPhone, `lapse-engage:${lapsedEventId}`, `msg-${Date.now()}-ok`),
    );
    expect(webhookRes.status()).toBe(200);

    // Wait a brief moment to ensure any asynchronous processing resolves
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify database is updated
    const checkLapseDb2 = await client.query("SELECT * FROM lapse_recoveries WHERE event_id = $1", [lapsedEventId]);
    expect(checkLapseDb2.rows[0].recovered_at).not.toBeNull();

    // Clean up database
    await client.query("DELETE FROM lapse_recoveries WHERE event_id = $1", [lapsedEventId]);
    await client.query("DELETE FROM ledger WHERE id = $1", [bookingId]);
    await client.query("DELETE FROM events WHERE id IN ($1, $2, $3)", [upcomingEventId, lapsedEventId, lapsedEventWithBookingId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });
});
