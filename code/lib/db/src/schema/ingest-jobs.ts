import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { purohitsTable } from "./purohits";

export const ingestJobsTable = pgTable("ingest_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  purohitId: uuid("purohit_id")
    .notNull()
    .references(() => purohitsTable.id),
  kind: text("kind").notNull(), // 'voice' | 'photo'
  status: text("status").notNull().default("received"), // received|transcribed|extracted|awaiting_confirm|confirmed|rejected|failed
  transcript: text("transcript"), // purged per §8
  extraction: jsonb("extraction"), // purged per §8
  fieldScores: jsonb("field_scores"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIngestJobSchema = createInsertSchema(ingestJobsTable).omit({ id: true });
export type InsertIngestJob = z.infer<typeof insertIngestJobSchema>;
export type IngestJob = typeof ingestJobsTable.$inferSelect;
