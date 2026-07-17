import crypto from "crypto";

/**
 * Short links, ported from minibag (`packages/shared/api/shortLinks.js`).
 *
 * Kept from minibag:
 *   - random code (6 bytes → 8 base64url chars), NOT derived from the target id.
 *     A derived code can't be unique and can't be reversed for lookup.
 *   - code is the PRIMARY KEY, so uniqueness is the database's job.
 *   - insert, and retry ONCE on a unique violation (23505).
 *   - `/{type}/{code}` path convention (minibag.in/j/… join, /b/… bill).
 *
 * Changed for Smaran, deliberately:
 *   - Invite links never expire (minibag's are session-scoped). See schema note.
 *   - Resolution is a SERVER-side 302, not minibag's client-side React redirect:
 *     these links are opened from a WhatsApp forward, often in a webview, and must
 *     not depend on our JS booting.
 *   - Invite links are get-or-create per purohit: asking for your referral card
 *     twice must not mint a second code.
 */

const PG_UNIQUE_VIOLATION = "23505";

/** Public base for short links. Falls back to the live API host. */
function shortLinkBase(): string {
  return (process.env.SHORT_LINK_BASE_URL || "https://api.smaran.click").replace(/\/+$/, "");
}

/** 6 random bytes → 8 URL-safe chars, exactly as minibag does it. */
function randomCode(): string {
  return crypto.randomBytes(6).toString("base64url");
}

/** Path prefix per type. Mirrors minibag's /j and /b. */
const TYPE_PREFIX: Record<string, string> = {
  invite: "i",
};

export function shortLinkUrl(type: string, code: string): string {
  return `${shortLinkBase()}/${TYPE_PREFIX[type] ?? "l"}/${code}`;
}

/**
 * Get the purohit's existing invite link, or mint one.
 *
 * Stable by design: a purohit asking for their referral card repeatedly gets the
 * same link, so a code already forwarded to a colleague keeps resolving.
 */
export async function getOrCreateInviteLink(
  purohitId: string,
  botNumber: string,
): Promise<string> {
  const { db, shortLinksTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  const [existing] = await db
    .select()
    .from(shortLinksTable)
    .where(and(eq(shortLinksTable.purohitId, purohitId), eq(shortLinksTable.type, "invite")))
    .limit(1);
  if (existing) return shortLinkUrl("invite", existing.code);

  // The invite payload stays the full UUID: it is parsed and validated at
  // onboarding, and a UUID is unguessable. The short code is only the wrapper.
  const target = `https://wa.me/${botNumber}?text=${encodeURIComponent(`invite:${purohitId}`)}`;

  const insert = async (code: string) =>
    db.insert(shortLinksTable).values({ code, type: "invite", target, purohitId }).returning();

  try {
    const [row] = await insert(randomCode());
    return shortLinkUrl("invite", row.code);
  } catch (err: any) {
    if (err?.code !== PG_UNIQUE_VIOLATION && err?.cause?.code !== PG_UNIQUE_VIOLATION) throw err;
    // Retry once on collision, as minibag does.
    const [row] = await insert(randomCode());
    return shortLinkUrl("invite", row.code);
  }
}

/** Resolve a code to its target. Returns null if unknown or expired. */
export async function resolveShortLink(code: string): Promise<string | null> {
  const { db, shortLinksTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const [row] = await db.select().from(shortLinksTable).where(eq(shortLinksTable.code, code)).limit(1);
  if (!row) return null;
  // expiresAt NULL = never expires (invite links).
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
  return row.target;
}
