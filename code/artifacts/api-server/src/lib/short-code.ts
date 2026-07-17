/**
 * Display-only reference code for a UUID.
 *
 * Used for the UPI mandate's `tr` field, which a purohit and family read inside a
 * chat bubble. A 36-char UUID there is most of the message and wraps over three
 * lines, which reads as spam.
 *
 * `tr` is DISPLAY/REFERENCE ONLY — nothing parses it back. Subscription activation
 * is an ownership-checked button tap (`subscribe-confirm:{yajmanId}`), never a
 * parse of this link. So this needs to be short and stable, not unique or
 * reversible. For a real short LINK (referral), use the short_links table instead:
 * random + unique-PK + retry, ported from minibag — see lib/short-link.ts.
 *
 * Takes the LAST 8 hex chars deliberately: v4 UUIDs are random throughout, but
 * *structured* ids (our seeded d0000000-0000-4000-8000-0000000000NN) vary only at
 * the tail. An earlier version sliced from the front and rendered every seeded
 * fixture as "00000000".
 */
export function refCode(uuid: string): string {
  return uuid.replace(/-/g, "").slice(-8).toUpperCase();
}
