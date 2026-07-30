import { pgTable, text, smallint, timestamp, uuid, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { yajmansTable } from "./yajmans";
import { purohitsTable } from "./purohits";
import { ledgerTable } from "./ledger";

export const occurrencesTable = pgTable("occurrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => eventsTable.id),
  yajmanId: uuid("yajman_id").notNull().references(() => yajmansTable.id),
  purohitId: uuid("purohit_id").notNull().references(() => purohitsTable.id),
  cycleYear: smallint("cycle_year").notNull(),          // Gregorian year of Vedika-resolved date
  performedOn: date("performed_on"),                     // nullable: bahi khata often gives year only
  source: text("source").notNull(),                      // 'bahi_khata' | 'ledger' | 'manual'
  ledgerId: uuid("ledger_id").references(() => ledgerTable.id),
  attestedBy: text("attested_by").notNull(),             // 'purohit' | 'both'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.eventId, t.cycleYear)
]);

export const insertOccurrenceSchema = createInsertSchema(occurrencesTable).omit({ id: true });
export type InsertOccurrence = z.infer<typeof insertOccurrenceSchema>;
export type Occurrence = typeof occurrencesTable.$inferSelect;



occurrencesTable.enableRLS();
