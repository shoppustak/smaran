import { test, expect } from "@playwright/test";

test.describe("WhatsApp Cloud API test layer", () => {
  test("POST /whatsapp/send fails clearly when credentials are not configured", async ({ request }) => {
    const res = await request.post("/api/whatsapp/send", {
      data: { to: "15551234567", message: "test" },
    });
    expect(res.status()).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("not configured");
  });

  test("GET /whatsapp/webhook verifies with a matching token", async ({ request }) => {
    const res = await request.get("/api/whatsapp/webhook", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": "e2e-test-verify-token",
        "hub.challenge": "challenge-123",
      },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe("challenge-123");
  });

  test("GET /whatsapp/webhook rejects a mismatched token", async ({ request }) => {
    const res = await request.get("/api/whatsapp/webhook", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "challenge-123",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /whatsapp/webhook records an inbound text message, visible via GET /whatsapp/messages", async ({ request }) => {
    const from = "15559998888";
    const text = `e2e probe ${Date.now()}`;

    const webhookRes = await request.post("/api/whatsapp/webhook", {
      data: {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [{ from, type: "text", text: { body: text } }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(webhookRes.status()).toBe(200);

    const messagesRes = await request.get("/api/whatsapp/messages");
    const messages = await messagesRes.json();
    const found = messages.find((m: any) => m.from === from && m.text === text);
    expect(found).toBeDefined();
  });
});
