import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as crypto from "crypto";

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

    // Verify upcoming pre-ritual alert was sent
    // Note that the outbound array is reversed (newest first). Let's search for messages to our purohitPhone
    const purohitMsgs = outbound.filter((msg: any) => msg.to === purohitPhone);
    
    // We expect 2 messages: 
    // - One for the upcoming pre-ritual alert (Event A)
    // - One for the lapse recovery nudge (Event B)
    // Event C should NOT have a nudge because it already has a booking ledger entry.
    expect(purohitMsgs.length).toBeGreaterThanOrEqual(2);

    // Validate the lapse recovery nudge message
    const lapseNudge = purohitMsgs.find((m: any) => m.text.includes("बुक नहीं हुआ है"));
    expect(lapseNudge).toBeDefined();
    // Message should look like: "शर्मा जी, यजमान Tiwari के परिवार का श्राद्ध / पुण्यतिथि (आषाढ़ कृष्ण दशमी) इस वर्ष अभी बुक नहीं हुआ है। क्या आप उन्हें संपर्क करना चाहते हैं?"
    // Verify parts of the text
    expect(lapseNudge.text).toContain("Tiwari"); // Yajman name
    expect(lapseNudge.text).toContain("Sharma जी"); // Purohit greeting
    expect(lapseNudge.text).toContain("Paternal Shraddh"); // Event type translation
    expect(lapseNudge.text).toContain("आषाढ़"); // Translated Maas (Ashadha)
    expect(lapseNudge.text).toContain("कृष्ण"); // Translated Paksha (Krishna)
    expect(lapseNudge.text).toContain("दशमी"); // Translated Tithi (10)
    expect(lapseNudge.text).toContain("lapse-engage:" + lapsedEventId); // Action ID on button

    // Validate the upcoming pre-ritual alert message
    const preRitualAlert = purohitMsgs.find((m: any) => m.text.includes("पूजा की पुष्टि करें") || m.text.includes("उपलब्ध हैं"));
    expect(preRitualAlert).toBeDefined();
    expect(preRitualAlert.text).toContain("Tiwari");
    expect(preRitualAlert.text).toContain("booking-confirm:" + upcomingEventId);

    // Verify that Event C (lapsed event with booking) did not generate a nudge
    const hasBookingNudge = purohitMsgs.some((m: any) => m.text.includes(lapsedEventWithBookingId));
    expect(hasBookingNudge).toBe(false);

    // Clean up database
    await client.query("DELETE FROM ledger WHERE id = $1", [bookingId]);
    await client.query("DELETE FROM events WHERE id IN ($1, $2, $3)", [upcomingEventId, lapsedEventId, lapsedEventWithBookingId]);
    await client.query("DELETE FROM yajmans WHERE id = $1", [yajmanId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });
});
