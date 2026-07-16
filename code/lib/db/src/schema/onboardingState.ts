import { pgTable, text, doublePrecision, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { purohitsTable } from "./purohits";

export const onboardingStateTable = pgTable("onboarding_state", {
  phoneNumber: text("phone_number").primaryKey(),
  currentStep: text("current_step").notNull().default("name"),
  name: text("name"),
  city: text("city"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  localityKey: text("locality_key"),
  upiId: text("upi_id"),
  calendarSystem: text("calendar_system"),
  referredByPurohitId: uuid("referred_by_purohit_id").references(() => purohitsTable.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOnboardingStateSchema = createInsertSchema(onboardingStateTable);
export type InsertOnboardingState = z.infer<typeof insertOnboardingStateSchema>;
export type OnboardingState = typeof onboardingStateTable.$inferSelect;
