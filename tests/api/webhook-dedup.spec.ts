import { test, expect } from "@playwright/test";
import crypto from "crypto";

test.describe("Webhook Deduplication", () => {
  const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "e2e-local-key";
  const TEST_PHONE = "919999999999";
  const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "0701fe4829a4745cb36105fa6e9ae1df";
  
  test.use({ baseURL: "http://127.0.0.1:3000" });

  function generateSignature(payload: string) {
    return `sha256=${crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex")}`;
  }

  function createWebhookPayload(messageId: string) {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1234567890",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "1234",
                  phone_number_id: "5678"
                },
                contacts: [{ profile: { name: "Test User" }, wa_id: TEST_PHONE }],
                messages: [
                  {
                    from: TEST_PHONE,
                    id: messageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: "नमस्ते" },
                    type: "text"
                  }
                ]
              },
              field: "messages"
            }
          ]
        }
      ]
    };
  }

  test("should successfully deduplicate using in-memory Set", async ({ request }) => {
    const messageId = `test-dedup-mem-${Date.now()}`;
    const payload = JSON.stringify(createWebhookPayload(messageId));
    const sig = generateSignature(payload);

    // First request should succeed
    let response = await request.post("/whatsapp/webhook", {
      headers: { "x-hub-signature-256": sig, "Content-Type": "application/json" },
      data: payload
    });
    expect(response.status()).toBe(200);

    // Second request with same messageId should be skipped but return 200
    response = await request.post("/whatsapp/webhook", {
      headers: { "x-hub-signature-256": sig, "Content-Type": "application/json" },
      data: payload
    });
    expect(response.status()).toBe(200);
  });

  test("should successfully deduplicate using Postgres when in-memory cache is cleared", async ({ request }) => {
    const messageId = `test-dedup-pg-${Date.now()}`;
    const payload = JSON.stringify(createWebhookPayload(messageId));
    const sig = generateSignature(payload);

    // First request should succeed and write to DB
    let response = await request.post("/whatsapp/webhook", {
      headers: { "x-hub-signature-256": sig, "Content-Type": "application/json" },
      data: payload
    });
    expect(response.status()).toBe(200);

    // Clear the in-memory cache to simulate server restart
    const clearResponse = await request.post("/test/clear-dedup-cache");
    expect(clearResponse.status()).toBe(200);

    // Second request with same messageId should bypass in-memory set and be caught by DB
    response = await request.post("/whatsapp/webhook", {
      headers: { "x-hub-signature-256": sig, "Content-Type": "application/json" },
      data: payload
    });
    expect(response.status()).toBe(200);
  });
});
