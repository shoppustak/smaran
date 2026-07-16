import { test, expect } from "@playwright/test";

/**
 * Onboarding conversation E2E test.
 * 
 * Requirements:
 * - Requires DATABASE_URL (smaran-dev) and INTERNAL_API_KEY exported in the invoking shell environment.
 * - See `docs/db-creds` for the database password and host configurations.
 * - Do NOT hardcode credentials or import from `@workspace/db` (root tests have a separate dependency tree).
 */

async function sendWebhookMessage(request: any, from: string, body: string) {
  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ from, type: "text", text: { body } }],
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
      // Sort relevant messages by sentAt ascending so relevant[0] is oldest, relevant[relevant.length - 1] is newest
      return relevant.sort((a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${expectedCount} outbound messages for ${from}`);
}

test.describe("Purohit Onboarding E2E Flow", () => {
  const internalApiKey = process.env.INTERNAL_API_KEY || "e2e-local-key";
  const dbUrl = process.env.DATABASE_URL;

  test.beforeAll(async () => {
    // Fail fast with a clear message when DATABASE_URL is unset, matching ledger.spec.ts/brain.spec.ts's
    // guard — without this, the test silently exercises the server's DB-unavailable fallback path
    // (a friendly "abhi setup ho raha hai" apology) instead of the real onboarding flow, and fails
    // with a confusing string-mismatch error deep in the test body instead of a clear precondition error.
    expect(dbUrl).toBeDefined();
  });

  test("should complete the 5-step onboarding conversation, validate persistence, and restrict unauthorized access", async ({ request }) => {
    // Generate a unique synthetic phone number for this run to avoid collisions in the shared DB
    const from = "1555" + Math.floor(1000000 + Math.random() * 9000000).toString().slice(-7);

    // 1. Initial greeting message
    await sendWebhookMessage(request, from, "namaste");
    let messages = await waitForOutboundMessages(request, from, 1);
    expect(messages[0].text).toContain("naam batayein");

    // 2. Name step -> transitions to city prompt
    await sendWebhookMessage(request, from, "Ramesh Sharma");
    messages = await waitForOutboundMessages(request, from, 2);
    expect(messages[1].text).toContain("shahar (city)");

    // 3. City step -> transitions to ward prompt
    await sendWebhookMessage(request, from, "Varanasi");
    messages = await waitForOutboundMessages(request, from, 3);
    expect(messages[2].text).toContain("area ya mohalla");

    // 4. Ward step -> triggers geocoding -> transitions to UPI prompt
    await sendWebhookMessage(request, from, "Assi Ghat");
    messages = await waitForOutboundMessages(request, from, 4);
    expect(messages[3].text).toContain("UPI ID");

    // 5. Invalid UPI step -> re-prompts for UPI (state does not advance)
    await sendWebhookMessage(request, from, "not-a-upi");
    messages = await waitForOutboundMessages(request, from, 5);
    expect(messages[4].text).toContain("valid UPI ID");

    // 6. Valid UPI step -> transitions to calendar system prompt
    await sendWebhookMessage(request, from, "ramesh@okhdfcbank");
    messages = await waitForOutboundMessages(request, from, 6);
    expect(messages[5].text).toContain("calendar system");

    // 7. Calendar system step -> completes onboarding, responds with confirmation & wow card
    await sendWebhookMessage(request, from, "purnimanta");
    messages = await waitForOutboundMessages(request, from, 8);
    expect(messages[6].text).toContain("Aapka account ban gaya hai");
    expect(messages[6].text).toContain("Varanasi");
    expect(messages[6].text).toContain("purnimanta");
    expect(messages[7].text).toContain("Sharma Family");

    // 8. Verify persistence via GET /api/purohits/:phoneNumber with valid internal api key
    const getPurohitRes = await request.get(`/api/purohits/${from}`, {
      headers: {
        "X-Internal-Key": internalApiKey,
      },
    });
    expect(getPurohitRes.status()).toBe(200);
    const record = await getPurohitRes.json();
    expect(record.name).toBe("Ramesh Sharma");
    expect(record.city).toBe("Varanasi");
    expect(record.calendarSystem).toBe("purnimanta");
    expect(record.upiId).toBe("ramesh@okhdfcbank");
    expect(typeof record.latitude).toBe("number");
    expect(typeof record.longitude).toBe("number");

    // 9. Verify unauthorized request is blocked (401) without X-Internal-Key header
    const unauthorizedRes = await request.get(`/api/purohits/${from}`);
    expect(unauthorizedRes.status()).toBe(401);
  });
});
