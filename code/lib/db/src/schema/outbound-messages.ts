import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const outboundMessagesTable = pgTable("outbound_messages", {
  id: text("id").primaryKey(), // We can use UUID or generated unique ID
  idempotencyKey: text("idempotency_key").notNull().unique(),
  recipientPhone: text("recipient_phone").notNull(),
  type: text("type").notNull(), // 'text' | 'template' | 'interactive'
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("queued"), // 'queued' | 'sent' | 'failed' | 'permanently_failed'
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorLog: jsonb("error_log"),
});



outboundMessagesTable.enableRLS();
