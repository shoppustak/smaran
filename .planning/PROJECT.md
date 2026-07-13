# Smaran

## What This Is

Smaran ("remembrance") is a WhatsApp bot that becomes an independent Hindu purohit's ledger, calendar, and memory. It converts each yajman family's Hindu-calendar dates to Gregorian dates, reminds the purohit ahead of rituals, detects lapsed families, guards festival-season scheduling against double-booking, and keeps a two-party corroborated dakshina record — money flows directly to the purohit's own UPI, never through the platform. It is a tool that defends the existing hereditary purohit-yajman relationship, not a marketplace; families only ever see their own purohit.

## Core Value

A purohit can trust Smaran as the single source of truth for their calendar and ledger: Hindu dates resolve correctly (including the purnimanta/amanta distinction — the one unforgivable error to avoid), every dakshina entry is corroborated by both purohit and family before it counts as paid, and money never passes through the platform. If this core loop breaks, nothing else about the product matters.

**Developer-facing success metric (this milestone):** First purohit onboarded end-to-end — a real purohit completes WhatsApp onboarding, logs a yajman event, and gets a corroborated payment recorded.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. See REQUIREMENTS.md for the full atomic breakdown. -->

- [ ] Purohit completes first-contact WhatsApp onboarding (name, geocoded city, locality, UPI ID, calendar system) and sees a first "wow" card within minutes
- [ ] Purohit populates the bahi khata via voice note or photo, never a typed sequential form; every AI extraction is confirmed before it's written
- [ ] A daily 6 AM job resolves the coming week via Vedika, sends pre-ritual cards, and detects lapsed families for re-engagement
- [ ] Purohit can pull an on-demand day-sheet by muhurat window with double-booking collision warnings
- [ ] Dakshina is recorded through a two-party corroborated ledger (pending → claimed → corroborated) via raw UPI deep links, never a webhook
- [ ] Families can optionally subscribe (₹29/mo) to their own ritual calendar, always attributed to their purohit, with no discovery of other purohits
- [ ] Purohit-to-purohit referral is instrumented with observed-k measurement for the growth gate

### Out of Scope

<!-- Explicit boundaries. These are unformalized candidate rules extracted from smaran-blueprint-v3.md Part 7 ("Negative Constraints") — NOT locked ADRs (no ADR-type docs existed in this ingest). Carried forward as strong candidates; recommend the team formalize as ADRs if locked enforcement is wanted. -->

- No marketplace, ratings, search, matching, or discovery — ever — trust is computed from corroborated interactions, never declared or rated; families must never see, compare, or reach any other purohit
- No consumer app or web UI — WhatsApp cards/confirms/subscription flow only; an app, portal, or catalog is not in scope
- No payment gateways or PSP checkout — raw dynamic UPI deep links to the purohit's own merchant VPA only; zero commission is the point
- No webhook-driven payment states — no webhook will ever arrive; corroboration button-taps are the only path to `corroborated`
- No samagri commerce — the samagri list is informational value only; kits, inventory, and fulfilment are out of scope
- No diaspora/NRI payment flows in v1 — international UPI is deferred (candidate v2 item, see REQUIREMENTS.md)
- No marketing blasts — registered Meta Utility templates only
- No system of record on WhatsApp — WhatsApp is the interface; PostgreSQL/Supabase is the truth
- No custom Panchang engine — Vedika API is the sole source of lunar-calendar computation

## Context

**Product vision & wedge:** Funded FaithTech incumbents are marketplace aggregators (batch pujas, 50-70% commission, priests treated as commissioned agents). Smaran's wedge is serving the existing hereditary purohit ↔ yajman relationship instead of replacing it. Target customer is the independent urban purohit with an established yajman roster — not the village archaka (no wallet) or the elite diaspora priest (different economy). Core anxieties addressed: missed tithi, drifting yajman, double-booked muhurat.

**Value ladder** (ordered by willingness-to-pay, not build order): REMEMBER (tithi/ritual resolution + reminders) → RECOVER (lapse detection/re-engagement, framed as "income protection") → PROTECT (festival-season schedule defense) → COLLECT (corroborated dakshina ledger). A standing succession promise (bahi khata handover to a purohit's successor) is the long-run retention moat.

**Business model:** Purohit pricing ₹1,499/yr anchor (₹999/yr early-bird seed cohort), ₹149/mo fallback only (never default — monthly invites churn against seasonal priest income). Family layer ₹29/mo UPI autopay is load-bearing to revenue geometry, not optional. Growth is structurally purohit-to-purohit only (families cannot recruit priests) — observed k is "the make-or-break number" and is currently unmeasured; k ≥ 1.3 is the single highest-risk assumption in the whole case. Pre-registered gates: M0-4 seed (70 activated purohits, density + observed k, revenue ₹0 by design) → M5-8 geometry (conversion ≥22%, family attach ≥3%, week-8 retention >60%) → M9-12 replicate (₹1.5-2L MRR at the optimistic edge of every parameter). Voiding k<1.15 or conversion/attach below threshold at their respective gates reopens the kill question.

**Blueprint's own recommended build order** (from the source doc's validation plan): State 1-2 (ingestion + wow) → State 3 (brain + lapse) → State 5 (corroboration) → States 4, 6, 7. This roadmap deliberately sequences State 5 (corroborated payments) directly after ingestion/onboarding, ahead of State 3 (daily brain), because the user-supplied developer success metric for this milestone is explicitly the onboarding → event-log → corroborated-payment loop, not lapse detection. See ROADMAP.md Overview for the reasoning.

**Existing repo state (brownfield note):** `code/` is a pnpm workspace (Node 24, TypeScript 5.9, Express 5, Drizzle ORM/Postgres, Zod, Orval codegen) imported with full prior git history. It currently contains scaffold/spike work only, not product implementation:
- `lib/db/src/schema/index.ts` — empty template, no product tables yet (the 4-table schema below is not yet applied).
- `artifacts/api-server/src/routes/panchang.ts` — a working spike against the Vedika sandbox (no API key wired yet; auto-switches to production when `VEDIKA_API_KEY`/`VEDIKA_API_BASE_URL` are set).
- `artifacts/api-server/src/routes/whatsapp.ts` — a working spike for WhatsApp Cloud API send/receive/webhook-verify, with an in-memory (non-persistent) inbound message buffer for demo purposes.
- `artifacts/smaran/` — a React/Vite mockup app (pages: Dashboard, Roster, Recover, Protect, Collect, Referral, Settings, Onboarding, AddEntry) that mirrors the value-ladder states as visual mockups. Treat as a design/prototype sandbox for previewing WhatsApp card content, not a shipped web UI — a shipped consumer web UI is out of scope per the negative constraints above.
- `.agents/memory/MEMORY.md` referenced by repo conventions but not present yet.

Phase 1 of this roadmap should audit and build on these spikes rather than redo them.

**Compliance context:** DPDP Act 2023 — gotra and death-anniversary data are religious personal data; minimal collection, consent captured at family-side first contact, deletion-on-request must be a built function not a manual promise. Meta 2026 general-purpose-AI prohibition requires task-specific agent registration ("ritual calendar and ledger assistant for Hindu priests"). Domain should be a trust-signaling TLD (smaran.in-class).

## Constraints

- **Tech stack**: Node.js/TypeScript pnpm monorepo (Express 5, Drizzle/Postgres, Zod, Orval), currently hosted/developed on Replit — inherited from the existing `code/` workspace, not to be re-platformed for this milestone.
- **Interface**: WhatsApp Cloud API only — never a system of record, never a general consumer app/web UI. Bot must be registered with Meta as a task-specific agent per the 2026 policy.
- **System of record**: Supabase (Postgres + Edge Functions) is the only source of truth. The 4-table schema (`purohits`, `yajmans`, `events`, `ledger`) is specified in `constraints.md` from the source blueprint and should be treated as a fixed contract for this milestone.
- **Calendar computation**: Vedika API only — no custom astronomical/Panchang logic is to be built.
- **Payments**: Raw dynamic UPI deep links to the purohit's own merchant VPA only. No PSP, no payment gateway, no payment webhooks — ever. Corroboration button-taps are the only path to a payment's `corroborated` state.
- **Messaging discipline**: All business-initiated outbound messaging must use registered Meta Utility templates (₹0.115-0.15/msg); conversational follow-ups ride the free 24h user-initiated service window. No marketing blasts.
- **Compliance**: DPDP Act 2023 (religious personal data — gotra, death anniversaries) and Meta 2026 agent-registration policy are hard constraints, not aspirational.
- **Distribution**: Organic/purohit-to-purohit only, 2-3 seed localities in one city maximum for this milestone — no paid acquisition, no door-to-door seeding (target: sabhas/priest associations).

## Key Decisions

<!-- No ADR-type documents existed in this ingest batch (0 ADRs synthesized), so nothing below carries LOCKED precedence. The 9 rows below are the unformalized candidate rules from smaran-blueprint-v3.md Part 7, carried forward for visibility per ingest instructions — they read like permanent architectural rules in the source doc but are NOT locked decisions. Formalize as ADRs (locked: true) in a future ingest if the team wants precedence enforcement. -->

| Decision (candidate, not locked) | Rationale | Outcome |
|----------|-----------|---------|
| No marketplace/ratings/search/discovery, ever | Trust is computed from corroboration, never declared; defends (doesn't replace) the purohit-yajman bond | — Pending (unformalized) |
| No consumer app or web UI | WhatsApp-only interface preserves zero-install, zero-new-behaviour distribution | — Pending (unformalized) |
| No payment gateways/PSP checkout | Raw UPI deep links keep zero commission — the commercial wedge vs. incumbents | — Pending (unformalized) |
| No webhook-driven payment states | Two-party corroboration is the only trust mechanism; no webhook will ever arrive | — Pending (unformalized) |
| No samagri commerce | Samagri list is informational value, not a fulfilment business | — Pending (unformalized) |
| No diaspora/NRI payment flows in v1 | International UPI complexity deferred; v1 scope stays narrow | — Pending (unformalized) |
| No marketing blasts | Registered Utility templates only, per Meta policy discipline | — Pending (unformalized) |
| No system of record on WhatsApp | Postgres/Supabase must be the durable truth; WhatsApp state is disposable | — Pending (unformalized) |
| No custom Panchang engine | Vedika API is the sole source of lunar-calendar computation | — Pending (unformalized) |

---
*Last updated: 2026-07-13 after initial roadmap creation (ingest → PROJECT.md/REQUIREMENTS.md/ROADMAP.md/STATE.md)*
