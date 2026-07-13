# Smaran Marketing Landing Page — Design Spec

_Companion to `docs/superpowers/plans/2026-07-13-tango-design-tokens.md` (visual palette/fonts). This spec covers a new, separate deliverable: a public marketing landing page._

## Purpose & scope

A static, public marketing/signup page for Smaran — a WhatsApp bot for independent urban purohits (Hindu priests). The page's only job: get the visitor to tap a WhatsApp CTA that opens the bot's onboarding flow (State 1). It is **not** the shipped product UI (the product itself stays WhatsApp-only per `CLAUDE.md` / `code/.agents/memory/smaran-product.md`) — this is a marketing/signup surface only, analogous to any SaaS landing page that funnels into a chat-based product.

**Two audiences, one page:**
- **The purohit** — arrives via referral link or sabha presentation, needs to trust it fast and tap through. May not be very tech-fluent.
- **The sabha/association organizer** — evaluating it *for* a group of priests before inviting a presentation; scrolls deeper for detail (how it works, pricing, trust).

Hero serves audience 1; sections below serve audience 2.

## Non-goals

- No backend calls, no auth, no data layer — fully static.
- No payment collection on the page itself (pricing is informational; conversion is the WhatsApp tap, not a checkout).
- No testimonials/social proof — none exist pre-launch. Don't fake affordances (no fake counters, no placeholder logos, no newsletter signup).
- No illustration/mandala asset commissioning — icons come from `lucide-react` (already used elsewhere in the workspace), no custom illustration work.
- Deployment/hosting choice is out of scope for this spec — a separate infra decision.

## Architecture

New pnpm workspace app: `code/artifacts/landing` — Vite + React + TypeScript, same shape as `smaran`/`mockup-sandbox` (Tailwind v4 CSS-first `@theme`, consumes `@workspace/design-tokens` directly — inherits the Tango-inspired palette from the companion tokens plan automatically). No `api-server` dependency. No Supabase. Not part of the WhatsApp bot backend build.

## Visual design direction

Follows the Tango reference screenshots (`docs/design ref/refero.design - *`) closely, approach **A** (minimal, tightly matched) — not a page-for-page clone of any Tango flow, style/interaction inspiration only:

- Single-column, generous whitespace.
- Solid violet CTA buttons (never gradient — gradient is reserved for decorative background accents).
- **One** soft, blurred radial gradient blob (violet → pink → teal) behind the hero only, decorative, doesn't compete with text — sampled from `docs/design ref/refero.design - Signing up & onboarding on Tango/step - 1.jpg`.
- Gradient two-tone text treatment on exactly one emphasis word per headline (e.g. "याद" / "remembers").
- Small colored eyebrow pills reserved for section headings if needed (optional per section, not mandatory everywhere).
- Palette/fonts: whatever `@workspace/design-tokens` resolves to once the companion tokens plan lands (violet primary `262 83% 58%`, terracotta secondary `16 75% 55%`, Inter sans, Playfair Display serif for headings — Devanagari headings fall back to system default since Playfair has no Devanagari glyphs).
- Hindi body copy: **Noto Sans Devanagari**, paired alongside Inter (new font import, added to `landing`'s own `fonts.css` — not added to the shared `@workspace/design-tokens` package, since Devanagari isn't needed by `smaran`/`mockup-sandbox` today).

## Internationalization (bilingual EN/HI)

- **Not a full i18n library** (react-i18next is overkill for one page). A typed content module per language: `content/hi.ts` and `content/en.ts`, both implementing one `LandingContent` TypeScript interface — the compiler catches a field added to one language and missed in the other.
- **Hindi is the default and primary language, English is the toggle** — the reader is a Hindi/Sanskrit-register professional; an English-default page signals "not for you" before the headline is read.
- `<LanguageToggle>`: small switch, top-right of the hero, reads **EN** (what you switch *to* from the Hindi default). Persists choice to `localStorage`.
- All components are pure presentation — zero hardcoded copy. Every string comes from the active language's content module.
- **wa.me pre-filled message is language-aware**: `नमस्ते स्मरण` when the page is in Hindi mode, `Hi Smaran` when in English mode, read from the same content module as everything else (not a special case).

## Content structure & full copy (source of truth)

Five sections, top to bottom. **The copy below (approved verbatim by the user) is the content source of truth** — implementation must use this text, not paraphrase it. Section headings shown are for spec navigation; on-page section headings (where present) are in the copy itself.

### §1 Hero

- Wordmark: स्मरण (Devanagari primary, Latin "Smaran" secondary)
- `<LanguageToggle>` top-right: reads **EN** in Hindi mode
- Headline (HI, gradient on "याद"): `आपका बही खाता — अब खुद **याद** रखता है`
- Headline (EN, gradient on "remembers"): `Your bahi khata — now it **remembers** for you`
- Subline (HI): `हर परिवार की तिथि, समय से पहले, WhatsApp पर — हमेशा आपके ही नाम से।`
- Subline (EN): `Every family's tithi, reminded ahead of time, on WhatsApp — always in your name.`
- CTA button (solid violet): HI `WhatsApp पर शुरू करें` · EN `Start on WhatsApp`
- Microcopy under button: HI `कोई app नहीं। कोई form नहीं। सीधे आपके WhatsApp पर।` · EN `No app. No forms. Straight on your WhatsApp.`
- QR: visible **only at ≥768px viewport**, side-by-side with the CTA button. Below 768px: button only (a phone can't scan its own screen). QR caption (≥768px only): HI `फ़ोन से scan करें` · EN `Scan with your phone`.
- QR image is a **build-time static asset** (generated once via a small script or the `qrcode` npm package, committed as a static file) — not client-side runtime generation.
- wa.me pre-filled message: `नमस्ते स्मरण` (HI mode) / `Hi Smaran` (EN mode)

### §2 How it works — «स्मरण आपके लिए क्या करता है» / "What Smaran does for you"

Single-column stack, icon + label + one line each. **Reader-facing labels only** — the internal value-ladder names (REMEMBER/RECOVER/PROTECT/COLLECT, used elsewhere in product docs) never appear on the page.

1. **तिथि स्मरण** / *Tithi reminders* — icon `bell-ring`
   HI: `हर परिवार की तिथि — श्राद्ध, कथा, जन्मदिन — पंचांग से मिलाकर, समय से पहले आपको याद दिला दी जाती है।`
   EN: `Every family's dates — shraddh, katha, birthdays — matched to the panchang and brought to you ahead of time.`
2. **पुनः सम्पर्क** / *Reconnect* — icon `heart-handshake`
   HI: `जो यजमान चुप हो गए हैं, स्मरण आपको बताता है — और आपके नाम से आदरपूर्वक नमस्कार भेजने में सहायता करता है।`
   EN: `Smaran notices the families who have gone quiet — and helps you send a respectful namaskar, in your name.`
3. **मुहूर्त सुरक्षा** / *Muhurat protection* — icon `shield-check`
   HI: `त्योहार के मौसम में एक ही मुहूर्त पर दो बुकिंग? स्मरण पहले ही सचेत कर देता है।`
   EN: `Two bookings in the same muhurat at festival time? Smaran warns you before it happens.`
4. **दक्षिणा, सम्मान सहित** / *Dakshina, with dignity* — icon `indian-rupee`
   HI: `पूजा के उपरान्त परिवार को धन्यवाद-कार्ड जाता है — दक्षिणा सीधे आपके अपने UPI में। कोई कमीशन नहीं, कभी नहीं।`
   EN: `After the ritual, the family receives a gratitude card — dakshina goes straight to your own UPI. No commission, ever.`

### §3 Trust row — «हमारा वचन» / "Our word"

Three plain statements, list or 3-column row, no cards:

1. HI: `यह कोई marketplace नहीं है — आपके यजमान केवल आपके हैं, और केवल आपको ही देखते हैं।`
   EN: `This is not a marketplace — your yajmans are yours alone, and they see only you.`
2. HI: `दक्षिणा सीधे आपके UPI में — बीच में कोई नहीं।`
   EN: `Dakshina goes straight to your UPI — no one in between.`
3. HI: `आपका बही खाता आपकी विरासत है — हर परिवार, हर गोत्र, हर तिथि, अगली पीढ़ी के लिए वैसे ही सुरक्षित।`
   EN: `Your bahi khata is your legacy — every family, every gotra, every tithi, kept intact for the next generation.`

### §4 Pricing — single card

- Framing line above card: HI `एक लौटा हुआ यजमान — कई वर्षों के शुल्क के बराबर।` · EN `One returned yajman covers years of the fee.`
- Card price: HI `₹1,499 / वर्ष` + `आपके क्षेत्र के पहले पुरोहितों के लिए — ₹999 / वर्ष` · EN `₹1,499 / year` + `For the first purohits of your area — ₹999 / year`
- Included (3 short lines): HI `असीमित परिवार और तिथियाँ · WhatsApp पर सब कुछ · पहले आज़माएँ, फिर निर्णय लें` · EN `Unlimited families and tithis · Everything on WhatsApp · Try first, decide later`
- Card CTA: same wa.me button, HI `WhatsApp पर शुरू करें` · EN `Start on WhatsApp`
- Fallback line beneath card (small, one line): HI `मासिक ₹149 की सुविधा भी उपलब्ध है।` · EN `A monthly plan at ₹149 is also available.`

### §5 Footer

- CTA (button only, **no QR** — QR is a hero-only asset): HI `WhatsApp पर शुरू करें` · EN `Start on WhatsApp`
- Succession line: HI `स्मरण — ताकि आपकी स्मृति, आपकी परम्परा बने।` · EN `Smaran — so that your memory becomes your tradition.`
- Privacy micro-line: HI `आपके परिवारों की जानकारी केवल आपकी है — कभी बेची नहीं जाएगी, और माँगते ही हटा दी जाएगी।` · EN `Your families' information is yours alone — never sold, and deleted the moment you ask.`
- Bottom row: `© स्मरण` — no social links, no newsletter (none exist; don't fake affordances)

### Copy rules (apply to any future additions to this page)

1. Hindi first, always; English is the translation, not the source.
2. Aap-form throughout; no exclamation marks; no startup vocabulary (free, hack, boost, unlock).
3. The word "commission" (कमीशन) appears only beside "नहीं / no."
4. Money language stays inside the dakshina register — gratitude, sammaan, seva; never "collect," "chase," or "payments due."
5. Nothing on the page may promise what the bot can't do in its first three minutes.

## Components

- `<LanguageToggle>` — EN/हिं switch, drives `LanguageContext`, persists to `localStorage`, default `"hi"`.
- `<Hero>` — wordmark, toggle, gradient headline, subline, `<WhatsAppCta variant="hero" />`.
- `<WhatsAppCta variant="hero" | "card" | "footer">` — one component, three placements. `variant="hero"` renders the QR at `≥768px` (Tailwind `hidden md:flex` on the QR block); `"card"` and `"footer"` render button-only, no QR. `href` and pre-filled message text both come from the active language's content module (language-aware wa.me link).
- `<HowItWorks>` — maps a typed array of 4 `{ icon, labelHi, labelEn, bodyHi, bodyEn }` entries.
- `<TrustRow>` — 3 plain statements, same content-driven pattern.
- `<PricingCard>` — framing line, price, early-bird line, included-list, `<WhatsAppCta variant="card" />`.
- `<Footer>` — `<WhatsAppCta variant="footer" />`, succession line, privacy line, copyright.

All content lives in `content/hi.ts` / `content/en.ts`, both implementing one `LandingContent` interface. Components read from context, never hardcode copy.

## Verification

No existing test framework covers `smaran`/`mockup-sandbox` (typecheck+build only, no unit/component test suite in this workspace) — same pattern here, nothing new introduced:

- **Typecheck**: `en.ts`/`hi.ts` both satisfy `LandingContent` — a field added to one and missed in the other fails the build, not a silently-missing string.
- **Build** succeeds; QR static asset resolves at the expected path.
- **Manual visual QA**, both languages: toggle EN⇄HI; confirm gradient headline renders correctly in both (Playfair→Devanagari-default fallback expected in Hindi mode); confirm QR shows `≥768px` / hides `<768px` (resize or device emulation); confirm the wa.me link's pre-filled message matches the active language at tap time (`नमस्ते स्मरण` in HI mode, `Hi Smaran` in EN mode).

## wa.me link

Test WhatsApp API number (not production): `+1 555 136 3612`. Link format:
`https://wa.me/15551363612?text=<url-encoded message>` — message text per active
language (`नमस्ते स्मरण` HI / `Hi Smaran` EN, per the i18n section above).

Store the raw number as a single constant (e.g. `WHATSAPP_NUMBER = "15551363612"`
in the content module or a small `config.ts`) — not hardcoded per-component — so
swapping in the production number later is a one-line change.

## Open items for the implementation plan (not this spec)

- Swap the test number above for the production/staging bot number once available.
- Static hosting choice for `landing` — deferred per Non-goals.
