# Requirements: Smaran

**Defined:** 2026-07-13
**Core Value:** A purohit can trust Smaran as the single source of truth for their calendar and ledger — Hindu dates resolve correctly, every dakshina entry is corroborated by both sides, and money never passes through the platform.

Source: all 7 requirements extracted from `smaran-blueprint-v3.md` Part 5 ("Product Requirements — Agent Doc A"), decomposed below into atomic, testable items. Original source-requirement names are noted per category for traceability back to `.planning/intel/requirements.md`.

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase.

### Onboarding

<!-- Source: REQ-purohit-onboarding -->

- [ ] **ONBD-01**: Purohit provides name, city (geocoded to lat/long), ward/temple-cluster (`locality_key`), merchant UPI ID, and calendar system (purnimanta/amanta) during first-contact WhatsApp onboarding
- [ ] **ONBD-02**: Within the first onboarding exchange, purohit sees one family + tithi resolved to this year's Gregorian date on a rendered card, before bulk import of the full roster is ever mentioned

### Ingestion

<!-- Source: REQ-voice-photo-ingestion -->

- [ ] **ING-01**: Purohit can send a voice note describing a family/event; system transcribes and extracts structured fields (family name, gotra, event type, maas/paksha/tithi) and presents them for one-tap confirm
- [ ] **ING-02**: Purohit can photograph bahi khata pages; vision extraction drafts entries which the purohit corrects and confirms
- [ ] **ING-03**: No AI-extracted entry (voice or photo) is written to the `yajmans`/`events` tables without explicit purohit confirmation ("the AI drafts, the priest ratifies")

### Scheduling & Recovery

<!-- Source: REQ-daily-brain-scheduling -->

- [ ] **BRAIN-01**: A daily 6:00 AM job queries Vedika for the coming week against the `events` table, respecting each purohit's calendar system, and sends pre-ritual cards ~7 and ~2 days ahead (tithi/date, ritual name, samagri list, "Confirm ritual" button) — these cards never include a payment link
- [ ] **BRAIN-02**: Any family whose annual ritual (by `last_performed_year` + expected maas) has no booking this cycle triggers a lapse-detected re-engagement nudge to the purohit; recovery count is instrumented as a tracked metric
- [ ] **BRAIN-03**: Solemn events (shraddh) and celebratory events (birthdays, kathas) use separate, native-speaker-reviewed template packs with different copy registers

### Schedule Protection

<!-- Source: REQ-schedule-protection -->

- [ ] **PROT-01**: Purohit can request an on-demand day-sheet ("my week" / "इस हफ्ते") returning bookings grouped by muhurat window
- [ ] **PROT-02**: When a new booking collides with an existing one in the same muhurat window, the purohit is warned before it is saved

### Corroborated Payments

<!-- Source: REQ-corroborated-payments -->

- [x] **PAY-01**: A post-ritual card is sent after the ritual date (or the purohit's "completed" tap) with gratitude framing, a dakshina UPI deep link to the purohit's own VPA, and a purohit-side "Dakshina received" tap
- [x] **PAY-02**: A family-side "Confirm" tap corroborates the ritual's occurrence only (never the amount), and also opens a free WhatsApp service window
- [x] **PAY-03**: The ledger state machine enforces `pending → claimed` (purohit tap) `→ corroborated` (both parties tapped) with no path to `corroborated` from a single side's assertion and no payment webhooks anywhere in the system

### Family Subscription

<!-- Source: REQ-family-calendar-subscription -->

- [ ] **FAM-01**: Cards sent to families surface an offer — "Get your family's ritual calendar" — with a ₹29/month UPI autopay deep link
- [ ] **FAM-02**: Family subscription state (active / lapsed / cancelled) is tracked, with renewal nudges sent as registered Utility messages
- [ ] **FAM-03**: The family-side flow never enables discovery, comparison, or contact with any purohit other than their own

### Growth Instrumentation

<!-- Source: REQ-referral-k-instrumentation -->

- [ ] **GROW-01**: Purohit can request an on-demand bot-generated personal referral card
- [ ] **GROW-02**: Onboardings arriving via a referral card set `referred_by_purohit_id` on the new purohit record
- [ ] **GROW-03**: A weekly job computes observed k = referred activations ÷ activated purohits, cohort-tagged — the primary measurement for the M4 growth gate

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments

- **PAY-04**: Diaspora/NRI international UPI payment flows — explicitly deferred "in v1" per blueprint Part 7 item 6, implying future consideration; not scoped or estimated for this milestone

## Out of Scope

Explicitly excluded. Carried forward from `smaran-blueprint-v3.md` Part 7 ("Negative Constraints") — unformalized candidates, not locked ADRs (see PROJECT.md Key Decisions).

| Feature | Reason |
|---------|--------|
| Marketplace, ratings, search, matching, or discovery of purohits | Trust is computed from corroborated interactions, never declared/rated; families must never compare or reach another purohit |
| Consumer app or web UI | WhatsApp-only interface; no portal/catalog/app is in scope |
| Payment gateways or PSP checkout | Raw UPI deep links to the purohit's own VPA only — zero commission is the point |
| Webhook-driven payment states | No webhook will ever arrive; corroboration taps are the only path to `corroborated` |
| Samagri commerce (kits, inventory, fulfilment) | The samagri list is informational value only |
| Marketing blasts / promotional broadcast messaging | Registered Meta Utility templates only |
| WhatsApp as system of record | PostgreSQL/Supabase is the sole source of truth |
| Custom Panchang/astronomical calculation engine | Vedika API is the sole source of lunar-calendar computation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 1 | Pending |
| ONBD-02 | Phase 1 | Pending |
| ING-01 | Phase 2 | Pending |
| ING-02 | Phase 2 | Pending |
| ING-03 | Phase 2 | Pending |
| PAY-01 | Phase 3 | Complete |
| PAY-02 | Phase 3 | Complete |
| PAY-03 | Phase 3 | Complete |
| BRAIN-01 | Phase 4 | Pending |
| BRAIN-02 | Phase 4 | Pending |
| BRAIN-03 | Phase 4 | Pending |
| PROT-01 | Phase 5 | Pending |
| PROT-02 | Phase 5 | Pending |
| FAM-01 | Phase 6 | Pending |
| FAM-02 | Phase 6 | Pending |
| FAM-03 | Phase 6 | Pending |
| GROW-01 | Phase 7 | Pending |
| GROW-02 | Phase 7 | Pending |
| GROW-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-13*
*Last updated: 2026-07-13 after initial roadmap creation*
