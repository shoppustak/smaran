import { test, expect } from "@playwright/test";
import { Client } from "pg";
import * as cryptoLib from "crypto";

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
                    id: `msg-${Date.now()}`,
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

async function waitForOutboundMessages(request: any, from: string, expectedCount: number, timeoutMs = 8000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const res = await request.get("/api/whatsapp/outbound");
    expect(res.status()).toBe(200);
    const outbound = await res.json();
    const relevant = outbound.filter((msg: any) => msg.to === from);
    if (relevant.length >= expectedCount) {
      return relevant.sort((a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${expectedCount} outbound messages for ${from}`);
}

test.describe("Schedule Protection E2E Flows", () => {
  test.describe.configure({ mode: "serial" });
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

  test("should return weekly schedule day-sheet formatted correctly when sending 'my week' or 'इस हफ्ते'", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = cryptoLib.randomUUID();
    const yajmanId = cryptoLib.randomUUID();

    const eventAId = cryptoLib.randomUUID();
    const eventBId = cryptoLib.randomUUID();

    // 1. Insert Purohit and Yajman
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

    // 2. Fetch tomorrow and day-after panchang values
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const tomorrowPanchangRes = await request.get(`/api/panchang?date=${tomorrowStr}`);
    expect(tomorrowPanchangRes.status()).toBe(200);
    const tomorrowPanchang = await tomorrowPanchangRes.json();

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split("T")[0];
    const dayAfterPanchangRes = await request.get(`/api/panchang?date=${dayAfterStr}`);
    expect(dayAfterPanchangRes.status()).toBe(200);
    const dayAfterPanchang = await dayAfterPanchangRes.json();

    // Seed events as recurring (date is null)
    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, date, time, source)
       VALUES ($1, $2, $3, 'katha', $4, $5, $6, 2026, 'Satyanarayan Puja', NULL, '09:30', 'manual')`,
      [eventAId, yajmanId, purohitId, tomorrowPanchang.masa.name, tomorrowPanchang.tithi.paksha, tomorrowPanchang.tithi.number]
    );

    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, date, time, source)
       VALUES ($1, $2, $3, 'birthday', $4, $5, $6, 2026, 'Son Birthday', NULL, '14:15', 'manual')`,
      [eventBId, yajmanId, purohitId, dayAfterPanchang.masa.name, dayAfterPanchang.tithi.paksha, dayAfterPanchang.tithi.number]
    );



    // 4. Send "my week" command
    await sendWebhookText(request, purohitPhone, "my week");

    let messages = await waitForOutboundMessages(request, purohitPhone, 1);
    let daySheet = messages[messages.length - 1].text;

    expect(daySheet).toContain("📅 आपका साप्ताहिक कार्यक्रम:");
    expect(daySheet).toContain("Satyanarayan Puja");
    expect(daySheet).toContain("Son Birthday");
    expect(daySheet).toContain("Tiwari");
    expect(daySheet).toContain("🌅 सुबह:");
    expect(daySheet).toContain("• 09:30");
    expect(daySheet).toContain("☀️ दोपहर:");
    expect(daySheet).toContain("• 14:15");

    // Clean up
    await client.query("DELETE FROM events WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM yajmans WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });

  test("should handle schedule collision flows (warning, force override, cancel) correctly", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = cryptoLib.randomUUID();
    const yajmanId = cryptoLib.randomUUID();

    const eventAId = cryptoLib.randomUUID();
    const jobBId = cryptoLib.randomUUID();
    const jobCId = cryptoLib.randomUUID();
    const jobDId = cryptoLib.randomUUID();

    // 1. Insert Purohit and Yajman
    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Ramesh', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'ramesh@upi', 'amanta', 'trial')`,
      [purohitId, purohitPhone]
    );

    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Pandey', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    // Seed Event A as recurring
    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, date, time, source)
       VALUES ($1, $2, $3, 'katha', 'Pausha', 'Shukla', 1, 2026, 'First Katha', NULL, '10:00', 'manual')`,
      [eventAId, yajmanId, purohitId]
    );

    // 3. Seed Ingest Job B with same date & time (Morning window collision)
    const extractionB = {
      family_name: "Mishra",
      gotra: "Kashyap",
      events: [
        {
          event_type: "birthday",
          maas: "Pausha",
          paksha: "Shukla",
          tithi_name: "Pratipada",
          label: "Second Event",
          gregorian_hint: "11:00",
        },
      ],
    };

    await client.query(
      `INSERT INTO ingest_jobs (id, purohit_id, status, kind, extraction, created_at, updated_at)
       VALUES ($1, $2, 'awaiting_confirm', 'voice', $3, NOW(), NOW())`,
      [jobBId, purohitId, JSON.stringify(extractionB)]
    );

    // 4. Confirm Ingest Job B -> should throw collision warning card
    await sendWebhookInteractive(request, purohitPhone, `confirm:${jobBId}`);

    let messages = await waitForOutboundMessages(request, purohitPhone, 1);
    let warningMsg = messages[messages.length - 1].text;

    expect(warningMsg).toContain("⚠️ चेतावनी: इस समय पर पहले से एक अनुष्ठान बुक है");
    expect(warningMsg).toContain("booking-force:" + jobBId);
    expect(warningMsg).toContain("booking-cancel:" + jobBId);

    // 5. Send force override message
    await sendWebhookInteractive(request, purohitPhone, `booking-force:${jobBId}`);

    messages = await waitForOutboundMessages(request, purohitPhone, 2);
    let forceAck = messages[messages.length - 1].text;
    expect(forceAck).toContain("अनुष्ठान बुक कर लिया गया है (ओवरराइड)");

    // Verify both events exist in the database
    const eventsRes = await client.query("SELECT * FROM events WHERE purohit_id = $1", [purohitId]);
    expect(eventsRes.rowCount).toBe(2);

    // 6. Seed Ingest Job C with same conflicting time to test Cancel action
    const extractionC = {
      family_name: "Mishra",
      gotra: "Kashyap",
      events: [
        {
          event_type: "birthday",
          maas: "Pausha",
          paksha: "Shukla",
          tithi_name: "Pratipada",
          label: "Third Event",
          gregorian_hint: "11:15",
        },
      ],
    };

    await client.query(
      `INSERT INTO ingest_jobs (id, purohit_id, status, kind, extraction, created_at, updated_at)
       VALUES ($1, $2, 'awaiting_confirm', 'voice', $3, NOW(), NOW())`,
      [jobCId, purohitId, JSON.stringify(extractionC)]
    );

    // Confirm Ingest Job C -> gets warning
    await sendWebhookInteractive(request, purohitPhone, `confirm:${jobCId}`);

    messages = await waitForOutboundMessages(request, purohitPhone, 3);
    warningMsg = messages[messages.length - 1].text;
    expect(warningMsg).toContain("⚠️ चेतावनी: इस समय पर पहले से एक अनुष्ठान बुक है");

    // Send cancel action
    await sendWebhookInteractive(request, purohitPhone, `booking-cancel:${jobCId}`);

    messages = await waitForOutboundMessages(request, purohitPhone, 4);
    let cancelAck = messages[messages.length - 1].text;
    expect(cancelAck).toContain("अनुष्ठान रद्द कर दिया गया है");

    // Verify Ingest Job C is in status 'rejected'
    const jobsRes = await client.query("SELECT status FROM ingest_jobs WHERE id = $1", [jobCId]);
    expect(jobsRes.rows[0].status).toBe("rejected");

    // 7. Seed Ingest Job D (afternoon window - no collision)
    const extractionD = {
      family_name: "Dubey",
      gotra: "Kashyap",
      events: [
        {
          event_type: "birthday",
          maas: "Pausha",
          paksha: "Shukla",
          tithi_name: "Pratipada",
          label: "Fourth Event",
          gregorian_hint: "15:00",
        },
      ],
    };

    await client.query(
      `INSERT INTO ingest_jobs (id, purohit_id, status, kind, extraction, created_at, updated_at)
       VALUES ($1, $2, 'awaiting_confirm', 'voice', $3, NOW(), NOW())`,
      [jobDId, purohitId, JSON.stringify(extractionD)]
    );

    // Confirm Ingest Job D -> should succeed immediately without warning card
    await sendWebhookInteractive(request, purohitPhone, `confirm:${jobDId}`);

    // Verify Ingest Job D is confirmed and event is saved
    const jobDRes = await client.query("SELECT status FROM ingest_jobs WHERE id = $1", [jobDId]);
    expect(jobDRes.rows[0].status).toBe("confirmed");

    const finalEventsRes = await client.query("SELECT * FROM events WHERE purohit_id = $1", [purohitId]);
    expect(finalEventsRes.rowCount).toBe(3);

    // Clean up
    await client.query("DELETE FROM events WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM yajmans WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM ingest_jobs WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });

  test("daily-brain cron persists the resolved-schedule cache and serves the warm-cache day-sheet", async ({ request }) => {
    const purohitPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);
    const yajmanPhone = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    const purohitId = cryptoLib.randomUUID();
    const yajmanId = cryptoLib.randomUUID();
    const eventId = cryptoLib.randomUUID();

    await client.query(
      `INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
       VALUES ($1, $2, 'Joshi', 'Varanasi', 25.3176, 82.9739, 'varanasi', 'joshi@upi', 'amanta', 'trial')`,
      [purohitId, purohitPhone]
    );
    await client.query(
      `INSERT INTO yajmans (id, purohit_id, family_name, whatsapp_number, locality_key, consent_status, family_sub_status)
       VALUES ($1, $2, 'Verma', $3, 'varanasi', 'confirmed', 'none')`,
      [yajmanId, purohitId, yajmanPhone]
    );

    // Recurring event matching tomorrow's panchang, seeded COLD (resolved_date NULL).
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const panchangRes = await request.get(`/api/panchang?date=${tomorrowStr}`);
    expect(panchangRes.status()).toBe(200);
    const panchang = await panchangRes.json();

    await client.query(
      `INSERT INTO events (id, yajman_id, purohit_id, event_type, maas, paksha, tithi, last_performed_year, label, date, time, source)
       VALUES ($1, $2, $3, 'katha', $4, $5, $6, 2026, 'Warm Cache Puja', NULL, '08:00', 'manual')`,
      [eventId, yajmanId, purohitId, panchang.masa.name, panchang.tithi.paksha, panchang.tithi.number]
    );

    // Precondition: cache is cold.
    const before = await client.query(
      "SELECT resolved_date, resolved_window, resolved_cycle_year FROM events WHERE id = $1",
      [eventId]
    );
    expect(before.rows[0].resolved_date).toBeNull();

    // Run the daily-brain cron (persistResolvedSchedule warms the cache).
    const cronRes = await request.post("/api/cron/daily-brain", {
      headers: { "x-cron-secret": process.env.CRON_SECRET || "e2e-local-key" },
    });
    expect(cronRes.status()).toBe(200);

    // The cron must have populated the resolved-schedule cache for this event.
    const after = await client.query(
      "SELECT resolved_date, resolved_window, resolved_cycle_year FROM events WHERE id = $1",
      [eventId]
    );
    expect(after.rows[0].resolved_date).not.toBeNull();
    expect(after.rows[0].resolved_window).toBe("morning");
    expect(after.rows[0].resolved_cycle_year).toBe(new Date().getFullYear());

    // The day-sheet is now served from the warm cache path (not the live fallback).
    await sendWebhookText(request, purohitPhone, "my week");
    const messages = await waitForOutboundMessages(request, purohitPhone, 1);
    const daySheet = messages[messages.length - 1].text;
    expect(daySheet).toContain("Warm Cache Puja");
    expect(daySheet).toContain("🌅 सुबह:");
    expect(daySheet).toContain("• 08:00");

    // Clean up
    await client.query("DELETE FROM events WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM yajmans WHERE purohit_id = $1", [purohitId]);
    await client.query("DELETE FROM purohits WHERE id = $1", [purohitId]);
  });
});
