import { Router, type IRouter } from "express";
import { SendWhatsappMessageResponse, ListWhatsappMessagesResponseItem } from "@workspace/api-zod";

const router: IRouter = Router();

// Meta WhatsApp Cloud API test layer.
// Requires WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID from the Meta App
// Dashboard (WhatsApp > API Setup) and WHATSAPP_VERIFY_TOKEN (any string you
// choose, must match what you enter in the Meta webhook config).
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const GRAPH_API_VERSION = "v21.0";

// In-memory ring buffer of recently received messages, for demo purposes only.
// Not persisted -- restarting the server clears it.
const MAX_MESSAGES = 50;
const inboundMessages: Array<{ from: string; text: string; receivedAt: string }> = [];

router.post("/whatsapp/send", async (req, res) => {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    res.status(502).json({
      error: "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    });
    return;
  }

  const { to, message } = req.body ?? {};
  if (typeof to !== "string" || typeof message !== "string") {
    res.status(400).json({ error: "Body must include 'to' and 'message' strings" });
    return;
  }

  try {
    const upstream = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      },
    );

    const body = (await upstream.json()) as Record<string, any>;

    if (!upstream.ok) {
      req.log.error({ status: upstream.status, body }, "Meta WhatsApp API returned an error");
      res.status(502).json({
        error: body?.error?.message ?? "Failed to send WhatsApp message via Meta API",
      });
      return;
    }

    const data = SendWhatsappMessageResponse.parse({
      status: "sent",
      messageId: body?.messages?.[0]?.id ?? "unknown",
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to reach Meta WhatsApp API");
    res.status(502).json({ error: "Failed to reach Meta WhatsApp API" });
  }
});

router.get("/whatsapp/messages", (_req, res) => {
  const data = inboundMessages
    .slice()
    .reverse()
    .map((m) => ListWhatsappMessagesResponseItem.parse(m));
  res.json(data);
});

// Meta calls this once with a GET to verify the webhook URL you register.
router.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && WHATSAPP_VERIFY_TOKEN && token === WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

// Meta calls this for every inbound message / status update.
router.post("/whatsapp/webhook", (req, res) => {
  // Always 200 immediately -- Meta retries aggressively on non-2xx responses.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    if (!Array.isArray(messages)) return;

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      inboundMessages.push({
        from: msg.from,
        text: msg.text?.body ?? "",
        receivedAt: new Date().toISOString(),
      });
      if (inboundMessages.length > MAX_MESSAGES) inboundMessages.shift();
      req.log.info({ from: msg.from }, "Received WhatsApp message");
    }
  } catch (err) {
    req.log.error({ err }, "Failed to parse WhatsApp webhook payload");
  }
});

export default router;
