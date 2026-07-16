import { test, expect } from "@playwright/test";
import { postSignedWebhook, signWebhookBody, textMessage } from "./helpers/webhook";

/**
 * Guards the HMAC-SHA256 gate on POST /api/whatsapp/webhook.
 *
 * Every other spec signs its payloads, so a broken gate would surface there as a
 * blanket failure. These cases pin the negative side: an unsigned, forged, or
 * malformed request must never be processed.
 */
test.describe("WhatsApp webhook signature verification", () => {
  const from = "15559990000";

  test("accepts a correctly signed payload", async ({ request }) => {
    const res = await postSignedWebhook(request, textMessage(from, `signed ${Date.now()}`));
    expect(res.status()).toBe(200);
  });

  test("rejects a payload with no signature header", async ({ request }) => {
    const res = await request.post("/api/whatsapp/webhook", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify(textMessage(from, "unsigned")),
    });
    expect(res.status()).toBe(401);
  });

  test("rejects a payload signed with the wrong secret", async ({ request }) => {
    const res = await postSignedWebhook(request, textMessage(from, "forged"), "not-the-real-secret");
    expect(res.status()).toBe(401);
  });

  test("rejects a malformed signature header", async ({ request }) => {
    const res = await request.post("/api/whatsapp/webhook", {
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "garbage-not-sha256-prefixed",
      },
      data: JSON.stringify(textMessage(from, "malformed")),
    });
    expect(res.status()).toBe(401);
  });

  test("rejects a tampered body whose signature no longer matches", async ({ request }) => {
    // Sign one body, then send a different one — the classic replay/tamper case.
    const signed = JSON.stringify(textMessage(from, "original"));
    const tampered = JSON.stringify(textMessage(from, "tampered"));
    const res = await request.post("/api/whatsapp/webhook", {
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signWebhookBody(signed),
      },
      data: tampered,
    });
    expect(res.status()).toBe(401);
  });
});
