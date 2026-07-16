import { logger } from "./logger";

const GRAPH_API_VERSION = "v21.0";

const MAX_OUTBOUND_MESSAGES = 1000;
const outboundMessages: Array<{ to: string; text: string; sentAt: string }> = [];

let lastSentAt = 0;

export function recordOutboundMessage(to: string, text: string): void {
  let now = Date.now();
  if (now <= lastSentAt) {
    now = lastSentAt + 1;
  }
  lastSentAt = now;

  outboundMessages.push({ to, text, sentAt: new Date(now).toISOString() });
  if (outboundMessages.length > MAX_OUTBOUND_MESSAGES) {
    outboundMessages.shift();
  }
}

export function getOutboundMessages(): Array<{ to: string; text: string; sentAt: string }> {
  return [...outboundMessages];
}

export class WhatsappSendError extends Error {
  status?: number;
  body?: any;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = "WhatsappSendError";
    this.status = status;
    this.body = body;
  }
}

export async function sendWhatsappMessage(
  to: string,
  payload:
    | { type: "text"; text: { body: string } }
    | { type: "interactive"; interactive: Record<string, unknown> }
): Promise<{ status: "sent"; messageId: string }> {
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  let messageText = "";
  if (payload.type === "text") {
    messageText = payload.text.body;
  } else {
    const body = payload.interactive?.body as Record<string, unknown> | undefined;
    if (body && typeof body.text === "string") {
      messageText = body.text;
    } else {
      messageText = `[Interactive] ${JSON.stringify(payload.interactive)}`;
    }

    const action = payload.interactive?.action as Record<string, any> | undefined;
    if (action) {
      if (Array.isArray(action.buttons)) {
        const buttonIds = action.buttons.map((b: any) => b.reply?.id).filter(Boolean);
        if (buttonIds.length > 0) {
          messageText += ` | Buttons: ${buttonIds.join(", ")}`;
        }
      }
      if (Array.isArray(action.sections)) {
        const rowIds: string[] = [];
        for (const sec of action.sections) {
          if (Array.isArray(sec.rows)) {
            for (const r of sec.rows) {
              if (r.id) rowIds.push(r.id);
            }
          }
        }
        if (rowIds.length > 0) {
          messageText += ` | ListRows: ${rowIds.join(", ")}`;
        }
      }
    }
  }

  // Record outbound message in all cases, matching previous behavior
  recordOutboundMessage(to, messageText);

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn({ to }, "WhatsApp is not configured. Mocking success response.");
    return { status: "sent", messageId: `mock-${Date.now()}` };
  }

  try {
    const upstream = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          ...payload,
        }),
      },
    );
    const body = (await upstream.json()) as Record<string, any>;
    if (!upstream.ok) {
      logger.error({ status: upstream.status, body }, "Meta WhatsApp API error");
      throw new WhatsappSendError(
        body?.error?.message ?? "Failed to send WhatsApp message via Meta API",
        upstream.status,
        body
      );
    }
    return { status: "sent", messageId: body?.messages?.[0]?.id ?? "unknown" };
  } catch (err) {
    if (err instanceof WhatsappSendError) {
      throw err;
    }
    logger.error({ err }, "Meta WhatsApp API error");
    throw new WhatsappSendError("Failed to reach Meta WhatsApp API", 502);
  }
}

export async function sendWhatsappTemplate(
  to: string,
  templateName: string,
  components: Array<any>
): Promise<{ status: "sent"; messageId: string }> {
  const desc = `[Template: ${templateName}] Components: ${JSON.stringify(components)}`;
  recordOutboundMessage(to, desc);

  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    throw new WhatsappSendError("WhatsApp is not configured.", 502);
  }

  try {
    const upstream = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: "hi" },
            components,
          },
        }),
      },
    );
    const body = (await upstream.json()) as Record<string, any>;
    if (!upstream.ok) {
      logger.error({ status: upstream.status, body }, "Meta WhatsApp API error");
      throw new WhatsappSendError(
        body?.error?.message ?? "Failed to send WhatsApp message via Meta API",
        upstream.status,
        body
      );
    }
    return { status: "sent", messageId: body?.messages?.[0]?.id ?? "unknown" };
  } catch (err) {
    if (err instanceof WhatsappSendError) {
      throw err;
    }
    logger.error({ err }, "Meta WhatsApp API error");
    throw new WhatsappSendError("Failed to reach Meta WhatsApp API", 502);
  }
}

