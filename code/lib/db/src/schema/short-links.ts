import { pgTable, varchar, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { purohitsTable } from "./purohits";

/**
 * Short links. Ported from minibag (`packages/shared/migrations/20260522_add_short_links.sql`),
 * which uses the same code-as-PK + retry-on-collision design and a `/{type}/{code}` path
 * convention (minibag.in/j/… join, /b/… bill). Smaran's first type is `invite` → /i/{code}.
 *
 * Why a table rather than deriving a code from the UUID: a derived code cannot be made unique
 * and cannot be reversed to look the record up. Random + PRIMARY KEY + retry gives both.
 *
 * Divergence from minibag, deliberate: `expires_at` is NULLABLE here. Minibag's links are
 * session-scoped and must expire; a purohit's referral invite is durable — it may sit in a
 * WhatsApp forward for months and must keep working. NULL = never expires.
 */
export const shortLinksTable = pgTable("short_links", {
  /** 8 chars, base64url. Primary key = uniqueness is enforced by the database, not by hope. */
  code: varchar("code", { length: 12 }).primaryKey(),
  /** Path segment + row type. 'invite' → /i/{code}. */
  type: varchar("type", { length: 10 }).notNull(),
  /** Absolute URL to 302 to. */
  target: text("target").notNull(),
  /** Owning purohit, when the link belongs to one (invite links do). */
  purohitId: uuid("purohit_id").references(() => purohitsTable.id),
  /** NULL = never expires. See note above. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ShortLink = typeof shortLinksTable.$inferSelect;



shortLinksTable.enableRLS();
