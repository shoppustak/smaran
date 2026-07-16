import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const processedWebhooksTable = pgTable("processed_webhooks", {
  messageId: text("message_id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});
