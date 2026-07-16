import { pgTable, text, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { purohitsTable } from "./purohits";
import { yajmansTable } from "./yajmans";
import { eventsTable } from "./events";

export const ledgerTable = pgTable("ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  purohitId: uuid("purohit_id").notNull().references(() => purohitsTable.id),
  yajmanId: uuid("yajman_id").notNull().references(() => yajmansTable.id),
  eventId: uuid("event_id").references(() => eventsTable.id),
  amountCollected: numeric("amount_collected", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").notNull().default("pending"),
  purohitClaimedAt: timestamp("purohit_claimed_at", { withTimezone: true }),
  familyConfirmedAt: timestamp("family_confirmed_at", { withTimezone: true }),
  localityKey: text("locality_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLedgerSchema = createInsertSchema(ledgerTable).omit({ id: true });
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type Ledger = typeof ledgerTable.$inferSelect;
