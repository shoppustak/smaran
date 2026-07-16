import { pgTable, text, smallint, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { yajmansTable } from "./yajmans";
import { purohitsTable } from "./purohits";

export const eventsTable = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  yajmanId: uuid("yajman_id").notNull().references(() => yajmansTable.id),
  purohitId: uuid("purohit_id").references(() => purohitsTable.id),
  date: timestamp("date", { withTimezone: true }),
  time: text("time"),
  eventType: text("event_type").notNull(),
  maas: text("maas").notNull(),
  paksha: text("paksha").notNull(),
  tithi: smallint("tithi").notNull(),
  lastPerformedYear: smallint("last_performed_year"),
  label: text("label"),
  source: text("source").notNull().default("manual"),
  ingestJobId: uuid("ingest_job_id"),
  resolvedDate: timestamp("resolved_date", { withTimezone: true }),
  resolvedWindow: text("resolved_window"),
  resolvedCycleYear: smallint("resolved_cycle_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
