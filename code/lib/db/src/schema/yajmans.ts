import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { purohitsTable } from "./purohits";

export const yajmansTable = pgTable("yajmans", {
  id: uuid("id").primaryKey().defaultRandom(),
  purohitId: uuid("purohit_id").notNull().references(() => purohitsTable.id),
  familyName: text("family_name").notNull(),
  gotra: text("gotra"),
  whatsappNumber: text("whatsapp_number"),
  localityKey: text("locality_key"),
  consentStatus: text("consent_status").notNull().default("pending"),
  familySubStatus: text("family_sub_status").notNull().default("none"),
  familySubRenewsAt: timestamp("family_sub_renews_at", { withTimezone: true }),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertYajmanSchema = createInsertSchema(yajmansTable).omit({ id: true });
export type InsertYajman = z.infer<typeof insertYajmanSchema>;
export type Yajman = typeof yajmansTable.$inferSelect;
