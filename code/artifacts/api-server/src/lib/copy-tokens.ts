/**
 * Shared presentation tokens for WhatsApp copy.
 *
 * ── HOUSE STYLE (decided 2026-07-16; readability over decoration) ────────────
 * Treat emoji as a VISUAL LANGUAGE, not decoration: one glyph, one meaning,
 * used the same way on every card, so a purohit learns it by repetition.
 *
 * Each card gets at most two, and both are load-bearing:
 *     ANCHOR (top)  — what this card IS (BEADS / NAMASTE / FLOWER / DIYA / ENVELOPE / BELL)
 *     POINT  (below)— what to DO: sits on the CTA line directly above the buttons
 * Never one emoji per line — a day-sheet should read like a ledger, not a
 * sticker wall.
 *
 * ── TWO LAYERS, AND WHY THE PALETTE SPLITS ──────────────────────────────────
 *   VOICE layer — STANDARD YELLOW. The bot's own gestures and status:
 *     👋 👇 👍 🤝 🙏 🔔 ⚠️
 *     Always the DEFAULT yellow — never skin-tone modifiers. Yellow is the
 *     neutral "this is the bot talking", it keeps the voice visually consistent
 *     across every card, and it sidesteps representing a specific person.
 *
 *   ANCHOR layer — COLOURED BY MEANING, one per card:
 *     📿 brown · 🌸 pink · 🪔 clay · ✉️ white · 🔔 gold
 *     These are cultural nouns; forcing them yellow would cost the meaning that
 *     makes them readable at a glance. Colour follows sense here, not palette.
 *
 * So: the voice is always yellow, the subject is whatever colour it truly is.
 * If a card ever needs a third emoji, it's the copy that's wrong, not the set.
 *
 *   - Structure comes from WhatsApp's own formatting: *bold* headers,
 *     _italic_ sub-headers, RULE as a divider.
 *   - Blank lines between blocks. Dense text gets skimmed, and the details that
 *     get skimmed here are dates and money.
 *   - ⚠️ is the one exception to the anchor rule: a collision warning earns it.
 *   - Hand gestures (🙏 / 👇) are deliberate: bots read as familiar when they
 *     gesture, and 🙏 is the native greeting of this product's users.
 *   - Greeting is *Pranaam*, not Namaste — the register a purohit is owed.
 *
 * ── THE BRAND IS ALSO A VERB ────────────────────────────────────────────────
 * "smaran" = remembrance; "smaran karna/rahe" = to remember / let it be remembered.
 * The product name does work inside a sentence, so it is allowed to:
 *     "X ji ne aapko _Smaran_ kiya hai"      — remembered you AND referred you
 *     "har yajman, har tithi, smaran rahega" — the promise, as a verb
 *     "_स्मरण रहे_ — 2 दिन शेष"                — the reminder naming itself
 *
 * Two rules, both load-bearing:
 *   1. GENTLY. Three uses in the whole product, on three different surfaces. A pun
 *      in every message stops being a pun and becomes a tic.
 *   2. The BRAND is _italic_ in running text, so it is visually distinct from the
 *      ordinary verb (plain lowercase). Bold stays reserved for labels and the
 *      nouns a purohit scans for — never for the wordplay, which should whisper.
 *
 * ── ROUND vs SQUARE ─────────────────────────────────────────────────────────
 * Emoji fall into two visual families, and mixing them inline is what makes
 * copy feel noisy:
 *
 *   ROUND / GLYPH — compact silhouettes on transparent ground. They sit on a
 *   text baseline like punctuation and stay legible at 16px. PREFERRED.
 *     sun/moon    ☀️ 🌞 🌝 🌙 🌛 🌜
 *     religious   ☸ ☯   (NOT 🕉 — Apple draws it as a purple square)
 *     flowers     🌸 🌺 🌼 🏵️ 💮 🌷
 *     marks       ✅ ❌ ✔️ ✖️ ➕ ➖ 🔴 🟢
 *     objects     📿 🙏 🔔 🥥
 *
 *   SQUARE / SCENE — full-bleed rectangular artwork with its own background.
 *   They read as pasted stickers, dominate the line, and at small sizes turn
 *   into muddy tiles. AVOID inline.
 *     landscapes  🌅 🌄 🌇 🌆 🌃 🌉   ← the worst offenders; these were the
 *                                       fuzzy tiles in the old day-sheet
 *     paper       📅 📆 🗓️ 📖 📕 🧾 📋 📄
 *     misc        🖼️ 🎴 📹
 *
 * Rule of thumb: if it has a background, it's a sticker — don't inline it.
 *
 * ── RENDERING FLOOR ─────────────────────────────────────────────────────────
 * Restricted to Unicode ≤ 8.0 wherever the glyph is load-bearing: anything
 * newer risks tofu on older Android handsets, which is exactly this market.
 *
 * Deliberately NOT used:
 *   - 卐 / 卍 — CJK ideographs, not emoji: font-dependent text glyphs that render
 *     inconsistently, carry a severe misreading outside India, and risk rejection
 *     in Meta template review.
 *   - Mandala — no such emoji exists; ☸ renders text-style on many devices.
 *   - ⏰ clock — the pre-ritual card's anchor is REGISTER-coded (🙏 solemn vs 🌸
 *     celebratory), which ROADMAP Phase 4 C3 requires as distinct template packs.
 *     A clock would flatten that distinction to say something *शेष दिन:* already
 *     says in words.
 *   - 📢 loudspeaker — reads as broadcast/marketing. This bot speaks to one
 *     purohit about one family; nothing here is announced to a crowd.
 *   - 😀 smileys — a ledger tool asking about a death anniversary must not grin.
 *     If one ever earns a slot it is 🙂 on a celebratory card only, never on
 *     shraddh, money, or errors. Currently: none. This is deliberate.
 */

/**
 * Envelope. Unicode 1.1 — the single exception to the no-SQUARE rule. Every other
 * envelope (📧 📨 📩 💌) is a full-bleed tile; this is the flattest, simplest glyph
 * of the set. Anchors the referral card, where "invitation" is what the card IS
 * and reads faster than the product's own mark.
 */
export const ENVELOPE = "✉️";

/**
 * Om. Unicode 7.0 (2014).
 *
 * ⚠️ CURRENTLY UNUSED — and that is a finding, not an oversight. Apple renders
 * 🕉 as a PURPLE ROUNDED SQUARE, i.e. SQUARE family: a tile that fights the
 * yellow voice layer and reads as a pasted sticker. Verified in the 2026-07-16
 * mockup renders. Classification by "is it conceptually round" is unreliable —
 * check the actual platform glyph before adopting one.
 *
 * The day-sheet it used to anchor now runs bare: a bold header plus RULE is
 * cleaner than any emoji there.
 */
export const OM = "🕉";

/** Prayer beads. ROUND. Unicode 8.0 (2015). Ritual + dakshina cards. */
export const BEADS = "📿";

/** Folded hands. ROUND. Unicode 6.0 — universal. Solemn/respectful address. */
export const NAMASTE = "🙏";

/** Cherry blossom. ROUND. Unicode 6.0 — universal. Celebratory register. */
export const FLOWER = "🌸";

/**
 * Diya lamp. ROUND. Unicode 12.0 (2019) — renders on current devices but may
 * tofu on older Android. Cosmetic use only, never load-bearing.
 */
export const DIYA = "🪔";

/**
 * Backhand index pointing down. ROUND (silhouette). Unicode 6.0 — universal.
 * Goes on the CTA line immediately above interactive buttons: the familiar bot
 * gesture that says "the thing to tap is here".
 */
export const POINT = "👇";

/** Waving hand. Unicode 6.0. First contact / welcome only — never reused later. */
export const WAVE = "👋";

/** Thumbs up. Unicode 6.0. Acknowledgement: "saved, done, recorded." */
export const DONE = "👍";

/**
 * Handshake. Unicode 9.0 (2016). Reserved for ONE moment: a ledger row reaching
 * `corroborated` — both purohit and family independently confirmed. The product's
 * central idea (two-sided agreement, no single party can assert payment) rendered
 * as a gesture. Do not spend it on anything else.
 */
export const AGREED = "🤝";

/**
 * Bell. ROUND. Unicode 6.0 — universal. Anchors the lapse-recovery nudge: the one
 * card that is purely a reminder ("this family has gone quiet"). Doubles as the
 * temple bell — a call to attention this audience reads instantly.
 */
export const BELL = "🔔";

/** Warning. Compact triangle. The one per-line emoji we keep: it carries signal. */
export const WARN = "⚠️";

/** Confirm. ROUND. Button affordance. */
export const TICK = "✅";

/** Reject. ROUND. Button affordance. */
export const CROSS = "❌";

/** Divider. Box-drawing, not emoji — renders everywhere, zero visual weight. */
export const RULE = "──────────────────";

/**
 * Samagri/checklist headers intentionally have NO emoji: 📖 and 📋 are SQUARE,
 * and a bold header does the job with less noise.
 */
