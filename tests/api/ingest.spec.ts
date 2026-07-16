import { test, expect } from "@playwright/test";
import { postSignedWebhook, webhookEnvelope } from "./helpers/webhook";

test.describe("Ingest Webhook Acceptance", () => {
  test("POST /whatsapp/webhook accepts audio messages with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const msgId = `audio-msg-${Date.now()}`;
    const webhookRes = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: msgId,
        from,
        type: "audio",
        audio: { id: "test-media-id", voice: true, duration: 10 },
      }),
    );
    expect(webhookRes.status()).toBe(200);
  });

  test("POST /whatsapp/webhook accepts image messages with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const msgId = `image-msg-${Date.now()}`;
    const webhookRes = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: msgId,
        from,
        type: "image",
        image: { id: "test-media-id" },
      }),
    );
    expect(webhookRes.status()).toBe(200);
  });

  test("POST /whatsapp/webhook accepts interactive message button replies with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const msgId = `interactive-msg-${Date.now()}`;
    const webhookRes = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: msgId,
        from,
        type: "interactive",
        interactive: { button_reply: { id: "confirm:nonexistent-job-id" } },
      }),
    );
    expect(webhookRes.status()).toBe(200);
  });

  test("POST /whatsapp/webhook accepts interactive reply with id edit:nonexistent-job-id with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const msgId = `edit-msg-${Date.now()}`;
    const webhookRes = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: msgId,
        from,
        type: "interactive",
        interactive: { list_reply: { id: "edit:nonexistent-job-id" } },
      }),
    );
    expect(webhookRes.status()).toBe(200);
  });

  test("POST /whatsapp/webhook accepts interactive reply with id candidate:nonexistent-job-id:gotra:0 with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const msgId = `candidate-msg-${Date.now()}`;
    const webhookRes = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: msgId,
        from,
        type: "interactive",
        interactive: { list_reply: { id: "candidate:nonexistent-job-id:gotra:0" } },
      }),
    );
    expect(webhookRes.status()).toBe(200);
  });

  test("POST /whatsapp/webhook accepts interactive reply freetext followed by plain text message with immediate 200", async ({ request }) => {
    const from = "15559998888";
    const freetextMsgId = `freetext-msg-${Date.now()}`;
    const textMsgId = `text-msg-${Date.now()}`;

    // 1. Send freetext interactive reply
    const res1 = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: freetextMsgId,
        from,
        type: "interactive",
        interactive: { list_reply: { id: "freetext:nonexistent-job-id:gotra" } },
      }),
    );
    expect(res1.status()).toBe(200);

    // 2. Send plain text reply
    const res2 = await postSignedWebhook(
      request,
      webhookEnvelope({
        id: textMsgId,
        from,
        type: "text",
        text: { body: "कश्यप" },
      }),
    );
    expect(res2.status()).toBe(200);
  });
});
