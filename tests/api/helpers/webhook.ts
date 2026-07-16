import * as crypto from "crypto";

// Server and signer must agree on the same secret. Tests never need the real
// Meta App Secret — a fixed value keeps the suite deterministic on a clean
// clone/CI, while still exercising the real signature-verification path
// (playwright.config.ts hands this same default to the api-server).
export const TEST_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "e2e-test-app-secret";

export function signWebhookBody(rawBody: string, secret: string = TEST_APP_SECRET): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * POST a signed payload to the WhatsApp webhook.
 *
 * The body is serialised once and sent verbatim so the bytes the server hashes
 * (express.json's `verify` buf) are exactly the bytes we signed.
 */
export async function postSignedWebhook(request: any, payload: unknown, secret?: string) {
  const rawBody = JSON.stringify(payload);
  return request.post("/api/whatsapp/webhook", {
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signWebhookBody(rawBody, secret),
    },
    data: rawBody,
  });
}

/** Build the Meta message-envelope wrapper around a single message object. */
export function webhookEnvelope(message: Record<string, unknown>) {
  return { entry: [{ changes: [{ value: { messages: [message] } }] }] };
}

export function textMessage(from: string, body: string, id = `msg-${Date.now()}-${Math.random()}`) {
  return webhookEnvelope({ id, from, type: "text", text: { body } });
}

export function interactiveMessage(
  from: string,
  interactiveId: string,
  id = `msg-${Date.now()}-${Math.random()}`,
) {
  return webhookEnvelope({
    id,
    from,
    type: "interactive",
    interactive: { button_reply: { id: interactiveId } },
  });
}
