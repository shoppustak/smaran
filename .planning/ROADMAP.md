# Roadmap: Smaran

## Overview

Smaran ships as seven phases that build the purohit's WhatsApp bot from first contact to a measurable growth loop. Phases 1-3 deliver the exact loop named in this milestone's success metric — a purohit onboards, logs a yajman event, and gets a corroborated dakshina payment recorded — as fast as possible: Phase 1 stands up the platform foundation (Supabase schema, Meta agent registration, WhatsApp/Vedika production wiring) alongside first-contact onboarding; Phase 2 adds voice/photo bahi khata ingestion so a purohit can actually log an event; Phase 3 closes the loop with the two-party corroborated dakshina ledger. This deliberately reorders the source blueprint's own suggested build sequence (ingestion+wow → daily-brain+lapse → corroboration → the rest) so that corroborated payments (State 5) land right after ingestion (States 1-2), ahead of the daily-brain/lapse system (State 3) — because proving the onboard→log→corroborate loop, not lapse detection, is this milestone's explicit developer-facing success bar. Phases 4-7 then build out the remaining value ladder and growth instrumentation: the daily 6 AM scheduling/lapse-recovery brain, on-demand schedule protection, the family calendar subscription revenue layer, and purohit-to-purohit referral instrumentation for the observed-k growth gate.

The existing `code/` workspace already has spike-level scaffolding (a Vedika sandbox panchang route, a WhatsApp Cloud API send/receive/webhook test route, an empty Drizzle schema, and a React mockup previewing the value-ladder screens). Phase 1 audits and builds on these rather than starting from zero.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Platform Foundation & Purohit Onboarding** - Purohit completes first-contact WhatsApp onboarding onto a real Supabase-backed system of record, and sees a resolved date card within minutes
- [ ] **Phase 2: Bahi Khata Ingestion** - Purohit populates yajman/event data by voice note or photo, never a typed form, with every AI extraction confirmed before it's saved
- [ ] **Phase 3: Corroborated Dakshina Ledger** - Purohit and family jointly corroborate a dakshina payment with money flowing only through UPI deep links, never the platform — closes the milestone's core loop
- [ ] **Phase 4: Daily Brain — Scheduling & Lapse Recovery** - A daily job proactively surfaces upcoming rituals and resurfaces lapsed families for re-engagement
- [ ] **Phase 5: Schedule Protection** - Purohit can defend festival-season scheduling with an on-demand day-sheet and double-booking warnings
- [ ] **Phase 6: Family Calendar Subscription** - Families can optionally pay for their own ritual calendar, always attributed to their own purohit
- [ ] **Phase 7: Referral & Growth Instrumentation** - Purohit-to-purohit referral is measurable, powering the observed-k growth gate

## Phase Details

### Phase 1: Platform Foundation & Purohit Onboarding
**Goal**: A purohit's first WhatsApp contact captures everything the rest of the product depends on (identity, location, UPI, calendar system), persists it in the real system of record, and proves the "wow" moment — a resolved date card — before anything else is asked of them.
**Depends on**: Nothing (first phase)
**Requirements**: ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. A purohit messaging the bot for the first time is walked through capturing name, city (geocoded to lat/long), locality_key, merchant UPI ID, and calendar system (purnimanta/amanta) — nothing else is asked before this.
  2. Within that same first exchange, the purohit sees one family + tithi resolved to this year's Gregorian date on a rendered card, before bulk import of their full roster is ever offered.
  3. All captured purohit data persists in Supabase Postgres (the `purohits` table, plus the `yajmans`/`events`/`ledger` tables standing ready per the fixed schema) — nothing purohit-identifying lives only in WhatsApp state.
  4. The bot is registered with Meta as a task-specific agent, and outbound onboarding messages use registered Utility templates, not free-form broadcast.
**Plans**: TBD

### Phase 2: Bahi Khata Ingestion
**Goal**: A purohit can build out their full yajman roster and event history the way they already keep it — by voice or by photographing their bahi khata — never by filling in a sequential typed form.
**Depends on**: Phase 1
**Requirements**: ING-01, ING-02, ING-03
**Success Criteria** (what must be TRUE):
  1. A purohit can send a voice note describing a family and event, and the bot presents transcribed/extracted fields (family name, gotra, event type, maas, paksha, tithi) for a single confirming tap.
  2. A purohit can photograph a bahi khata page and the bot presents vision-extracted draft entries for correction and confirmation.
  3. Nothing extracted by voice or photo reaches the `yajmans` or `events` tables until the purohit explicitly confirms it.
**Plans**: TBD

### Phase 3: Corroborated Dakshina Ledger
**Goal**: Every dakshina payment is recorded only when both the purohit and the family have independently corroborated it — closing the milestone's core success loop (onboard → log event → corroborated payment).
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03
**Success Criteria** (what must be TRUE):
  1. After a ritual date passes (or the purohit taps "completed"), the family/purohit receive a post-ritual card with gratitude framing and a dakshina UPI deep link pointed at the purohit's own VPA.
  2. The purohit can tap "Dakshina received" and the family can independently tap "Confirm" — the family's tap corroborates that the ritual happened, never the amount.
  3. A ledger row only reaches `corroborated` after both the purohit's `claimed` tap and the family's confirm tap have landed; no payment webhook exists anywhere in this path, and no single side's assertion alone can mark a row paid.
  4. A real purohit can be walked through the complete loop end to end: onboarded (Phase 1), logs a yajman event (Phase 2), and gets that event's dakshina recorded as corroborated here — proving the milestone's success metric.
**Plans**: TBD

### Phase 4: Daily Brain — Scheduling & Lapse Recovery
**Goal**: The purohit's calendar starts working for them without being asked — rituals are surfaced ahead of time, and families who've gone quiet are flagged for re-engagement before they're lost.
**Depends on**: Phase 3
**Requirements**: BRAIN-01, BRAIN-02, BRAIN-03
**Success Criteria** (what must be TRUE):
  1. A daily 6:00 AM job resolves the coming week against every purohit's `events` table (respecting each purohit's own calendar system) and sends pre-ritual cards ~7 and ~2 days ahead with tithi/date, ritual name, samagri list, and a "Confirm ritual" tap — never a payment link.
  2. Any family whose annual ritual has no booking logged for the current cycle triggers a re-engagement nudge to the purohit, and each recovery is counted as a tracked metric.
  3. Shraddh (solemn) and celebratory (birthday/katha) events send from separate, native-speaker-reviewed template packs with distinct copy registers.
**Plans**: TBD

### Phase 5: Schedule Protection
**Goal**: A purohit heading into festival season can see their real commitments at a glance and gets warned before double-booking a muhurat.
**Depends on**: Phase 4
**Requirements**: PROT-01, PROT-02
**Success Criteria** (what must be TRUE):
  1. A purohit can send a "my week" / "इस हफ्ते" command and get back their bookings grouped by muhurat window.
  2. Attempting to save a new booking that collides with an existing one in the same muhurat window triggers a warning before it's saved, not after.
**Plans**: TBD

### Phase 6: Family Calendar Subscription
**Goal**: Families who want their own copy of the ritual calendar can pay for it directly, with the relationship always anchored to their own purohit.
**Depends on**: Phase 4
**Requirements**: FAM-01, FAM-02, FAM-03
**Success Criteria** (what must be TRUE):
  1. Cards sent to families surface a "Get your family's ritual calendar" offer with a ₹29/month UPI autopay deep link.
  2. Subscription state (active / lapsed / cancelled) is tracked per family, and renewal nudges go out as registered Utility messages.
  3. At no point in this flow can a family discover, compare, or reach any purohit other than their own.
**Plans**: TBD

### Phase 7: Referral & Growth Instrumentation
**Goal**: The single highest-risk assumption in the business case — that purohit-to-purohit referral can sustain observed k ≥ 1.3 — becomes measurable rather than assumed.
**Depends on**: Phase 1
**Requirements**: GROW-01, GROW-02, GROW-03
**Success Criteria** (what must be TRUE):
  1. A purohit can request their personal referral card on demand from the bot.
  2. A new purohit onboarding via someone else's referral card has `referred_by_purohit_id` set on their record.
  3. A weekly job computes observed k (referred activations ÷ activated purohits, cohort-tagged) — the number the M4 growth gate is decided on.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Foundation & Purohit Onboarding | 0/TBD | Not started | - |
| 2. Bahi Khata Ingestion | 0/TBD | Not started | - |
| 3. Corroborated Dakshina Ledger | 0/TBD | Not started | - |
| 4. Daily Brain — Scheduling & Lapse Recovery | 0/TBD | Not started | - |
| 5. Schedule Protection | 0/TBD | Not started | - |
| 6. Family Calendar Subscription | 0/TBD | Not started | - |
| 7. Referral & Growth Instrumentation | 0/TBD | Not started | - |
