# Requirements (PRD intel)

Synthesized by gsd-doc-synthesizer · mode: new

No standalone PRD-classified files were present in this ingest batch. The requirements below are extracted from `smaran-blueprint-v3.md` Part 5 ("Product Requirements — Agent Doc A"), which the classifier's notes flagged as PRD-like content embedded inside a SPEC-classified document. Extracted per-requirement for downstream planning; each retains its source state number for traceability.

No overlapping/competing requirements were found (single source document, no other PRD content in this ingest set) — no `competing-variants` entries required.

---

## REQ-purohit-onboarding

**Description:** First-contact flow collects purohit name, city (geocoded lat/long), ward/temple-cluster (`locality_key`), merchant UPI ID, and calendar system (purnimanta/amanta — North vs South India lunar month reckoning).

**Acceptance criteria:**
- First three minutes scoped to one family, one date, one card: purohit enters a single family + tithi and sees it resolved to this year's Gregorian date on a rendered card before bulk import is mentioned.
- Calendar system (purnimanta/amanta) must be captured at onboarding — described as preventing "the product's only unforgivable error" (wrong-fortnight shraddh reminder).

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 1, lines 63-65)

---

## REQ-voice-photo-ingestion

**Description:** Bahi khata ingestion is voice-first or photo-first; no sequential typed-form data entry.

**Acceptance criteria:**
- Voice path: purohit sends a voice note; system transcribes and extracts structured fields (family name, gotra, event type, maas/paksha/tithi); presents for one-tap confirm.
- Photo path: purohit photographs bahi khata pages; vision extraction drafts entries; purohit corrects and confirms.
- Every AI extraction must be confirmed by the purohit before being written to the ledger ("the AI drafts, the priest ratifies").

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 2, lines 67-71)

---

## REQ-daily-brain-scheduling

**Description:** A 6:00 AM daily Edge Function queries Vedika for the coming week against the events table (respecting each purohit's calendar system) and triggers pre-ritual cards and lapse detection.

**Acceptance criteria:**
- Pre-ritual cards sent ~7 and ~2 days ahead: tithi/date, ritual name, samagri list, "Confirm ritual ✓" button for the family.
- Pre-ritual cards must never include a payment link.
- Lapse detection: any family whose annual ritual (by `last_performed_year` + expected maas) has no booking this cycle triggers a re-engagement "namaskar" card prompt to the purohit. Must be instrumented (recovery count is a core product metric).
- Solemn events (shraddh) and celebratory events (birthdays, kathas) use separate template packs with different copy registers, native-speaker reviewed before Meta submission.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 3, lines 73-77)

---

## REQ-schedule-protection

**Description:** On-demand day-sheet ("my week" / "इस हफ्ते") returning bookings by muhurat window, with collision warnings.

**Acceptance criteria:**
- Bot command returns purohit's day-sheet grouped by muhurat window.
- When a new booking collides with an existing one in the same window, warn before saving.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 4, lines 79-80)

---

## REQ-corroborated-payments

**Description:** Two-party corroborated dakshina ledger with no payment webhooks; raw UPI deep links to the purohit's own VPA.

**Acceptance criteria:**
- Post-ritual card sent after ritual date (or purohit's "completed" tap): gratitude framing + dakshina UPI deep link + purohit-side "Dakshina received ✓" + family-side "Confirm ✓" (family tap also opens a free WhatsApp service window).
- Ledger state machine: `pending → claimed` (purohit taps) `→ corroborated` (both parties tapped). Never mark paid on one side's assertion alone.
- Amount is entered by the purohit only; family confirmation corroborates occurrence, never amount.
- No payment webhooks exist or will exist in this system — corroboration buttons are the only path to `corroborated`.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 5, lines 82-87)

---

## REQ-family-calendar-subscription

**Description:** Optional family-side subscription to their own ritual calendar, always attributed to their purohit.

**Acceptance criteria:**
- Offer surfaced on cards families receive: "Get your family's ritual calendar."
- ₹29/month via UPI autopay deep link.
- Subscription states managed: active / lapsed / cancelled; renewal nudges sent as registered Utility messages.
- The family flow must never enable discovery, comparison, or contact with any other purohit.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 6, lines 89-90)

---

## REQ-referral-k-instrumentation

**Description:** Purohit-to-purohit referral flow with observed-k measurement.

**Acceptance criteria:**
- On-demand bot generates purohit's personal referral card.
- Onboardings via referral card set `referred_by_purohit_id`.
- Weekly job computes observed k = referred activations ÷ activated purohits (cohort-tagged) — this is the primary measurement for the M4 growth gate.
- Seeding strategy targets sabhas/priest associations, not door-to-door.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5, State 7, lines 92-93)
