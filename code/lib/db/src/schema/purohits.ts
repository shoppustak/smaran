import { pgTable, text, doublePrecision, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const purohitsTable = pgTable("purohits", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  localityKey: text("locality_key").notNull(),
  upiId: text("upi_id").notNull(),
  calendarSystem: text("calendar_system").notNull().default("purnimanta"),
  plan: text("plan").notNull().default("trial"),
  renewsAt: timestamp("renews_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  referredByPurohitId: uuid("referred_by_purohit_id").references((): AnyPgColumn => purohitsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurohitSchema = createInsertSchema(purohitsTable).omit({ id: true });
export type InsertPurohit = z.infer<typeof insertPurohitSchema>;
export type Purohit = typeof purohitsTable.$inferSelect;
