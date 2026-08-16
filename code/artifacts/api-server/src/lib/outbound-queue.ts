import { db, outboundMessagesTable } from "@workspace/db";
import { eq, and, lt, lte, or, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";
import crypto from "crypto";
import { sendWhatsappMessage, sendWhatsappTemplate, WhatsappSendError } from "./whatsapp-client";

export async function enqueueOutboundMessage(
  recipientPhone: string,
  type: "text" | "template" | "interactive",
  payload: any,
  idempotencyKey?: string
): Promise<string> {
  const id = crypto.randomUUID();
  const key = idempotencyKey || id;

  try {
    await db.insert(outboundMessagesTable).values({
      id,
      idempotencyKey: key,
      recipientPhone,
      type,
      payload,
      status: "queued",
      attempts: 0,
    }).onConflictDoNothing({ target: outboundMessagesTable.idempotencyKey });
    
    return key;
  } catch (err) {
    logger.error({ err, recipientPhone, type }, "Failed to enqueue outbound message");
    throw err;
  }
}

export async function flushOutboundQueue(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const now = new Date();
  const maxRetries = 3;

  try {
    // Find messages that need to be processed
    const messages = await db
      .select()
      .from(outboundMessagesTable)
      .where(
        and(
          or(
            eq(outboundMessagesTable.status, "queued"),
            eq(outboundMessagesTable.status, "failed")
          ),
          lt(outboundMessagesTable.attempts, maxRetries),
          lte(outboundMessagesTable.nextRetryAt, now)
        )
      )
      .limit(50); // Process in batches

    if (messages.length === 0) return;

    for (const msg of messages) {
      const attempts = msg.attempts + 1;
      let status: "sent" | "failed" | "permanently_failed" = "failed";
      let errorLog = msg.errorLog || {};
      let nextRetryAt = new Date();

      try {
        if (msg.type === "template") {
          const payload = msg.payload as { templateName: string; components: any[] };
          await sendWhatsappTemplate(msg.recipientPhone, payload.templateName, payload.components);
        } else {
          const payload = msg.payload as { type: "text"; text: { body: string } } | { type: "interactive"; interactive: Record<string, unknown> };
          await sendWhatsappMessage(msg.recipientPhone, payload);
        }
        status = "sent";
      } catch (err: any) {
        status = attempts >= maxRetries ? "permanently_failed" : "failed";
        const delayMinutes = attempts === 1 ? 5 : 10;
        nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);
        
        errorLog = {
          ...((errorLog as any) || {}),
          [attempts]: {
            message: err.message,
            status: err.status,
            time: new Date().toISOString()
          }
        };
        logger.error({ err, msgId: msg.id, attempts }, "Failed to process outbound message");
      }

      await db
        .update(outboundMessagesTable)
        .set({
          status,
          attempts,
          nextRetryAt: status === "failed" ? nextRetryAt : msg.nextRetryAt,
          sentAt: status === "sent" ? new Date() : msg.sentAt,
          errorLog,
        })
        .where(eq(outboundMessagesTable.id, msg.id));
    }
  } catch (err) {
    logger.error({ err }, "Error flushing outbound queue");
  }
}
