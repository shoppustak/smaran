import { pgTable, integer, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { purohitsTable } from "./purohits";
import { yajmansTable } from "./yajmans";
import { eventsTable } from "./events";

export const lapseRecoveriesTable = pgTable("lapse_recoveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => eventsTable.id),
  purohitId: uuid("purohit_id").notNull().references(() => purohitsTable.id),
  yajmanId: uuid("yajman_id").notNull().references(() => yajmansTable.id),
  cycleYear: integer("cycle_year").notNull(),
  nudgedAt: timestamp("nudged_at", { withTimezone: true }).notNull().defaultNow(),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("lapse_recoveries_event_year_idx").on(table.eventId, table.cycleYear)
]);

export const insertLapseRecoverySchema = createInsertSchema(lapseRecoveriesTable).omit({ id: true });
export type InsertLapseRecovery = z.infer<typeof insertLapseRecoverySchema>;
export type LapseRecovery = typeof lapseRecoveriesTable.$inferSelect;
