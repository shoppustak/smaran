import { pgTable, uuid, text, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { yajmansTable } from "./yajmans";

export const familyContentLogTable = pgTable(
  "family_content_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    yajmanId: uuid("yajman_id")
      .notNull()
      .references(() => yajmansTable.id),
    contentDate: date("content_date").notNull(),
    contentType: text("content_type").notNull(),
    messageId: text("message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      // Prevent sending the same content type to the same family on the same day
      uniqueDailyContent: uniqueIndex("unique_daily_content_idx").on(
        table.yajmanId,
        table.contentDate,
        table.contentType
      ),
    };
  }
);



familyContentLogTable.enableRLS();
