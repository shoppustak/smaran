---
phase: 03-corroborated-dakshina-ledger
plan: 04
subsystem: payments
tags: [whatsapp, upi, drizzle, playwright, e2e]

# Dependency graph
requires:
  - phase: 03-corroborated-dakshina-ledger (03-01/03-02/03-03)
    provides: "ledger.ts state machine (createLedgerEntry/claimLedgerEntry/confirmLedgerEntry), confirm-card.ts card builders, upi.ts deep-link builder, ledger-claim/ledger-confirm webhook routing, GET /ledger/:id"
provides:
  - "ritual-completed WhatsApp trigger that creates the pending ledger row only after the purohit marks a ritual done (no more premature null-amount rows from booking-confirm)"
  - "Free-text amount-capture handler: findAwaitingAmountEntry + recordDakshinaAmount in ledger.ts"
  - "buildRitualCompletedCard prompt card in confirm-card.ts"
  - "Real call sites for the previously-orphaned buildPostRitualPurohitCard, buildPostRitualFamilyCard, and buildUpiDeepLink"
  - "E2E test proving the full booking-confirm -> ritual-completed -> amount entry -> claim -> confirm loop through the webhook, with zero raw-SQL ledger seeding"
affects: [payments, whatsapp-routing, ledger]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Amount-capture free-text reply gated by findAwaitingAmountEntry, scoped strictly to the sender's own resolved purohit.id (mirrors the ownership-check pattern already used by claimLedgerEntry/confirmLedgerEntry)"
    - "Each outbound sendWhatsappMessage call in a multi-send sequence is individually try/caught so a Meta API failure on one message does not block subsequent independent sends (matches the existing onboarding-reply-loop pattern in whatsapp.ts)"
    - "Fail-closed UPI validation: isValidUpiId checked immediately before buildUpiDeepLink; on failure, an alert is sent and no card is dispatched"

key-files:
  created: []
  modified:
    - code/artifacts/api-server/src/lib/ledger.ts
    - code/artifacts/api-server/src/lib/confirm-card.ts
    - code/artifacts/api-server/src/routes/whatsapp.ts
    - tests/api/ledger.spec.ts

key-decisions:
  - "recordDakshinaAmount only ever updates amountCollected, never paymentStatus -- recording the amount is a value update within the pending state, not itself a state transition (claim/confirm remain the only state-transition triggers)"
  - "ritual-completed handler is idempotent: repeat taps on an event that already has a pending, amount-unset ledger row resend the amount-request prompt instead of creating a duplicate row; taps on an event whose ledger row has already moved past that point are silent no-ops"
  - "Each dakshina-card dispatch (purohit + family) is wrapped in its own try/catch rather than one shared try/catch around both sends, so a Meta API failure on the first send does not prevent the second party's card from being dispatched"

requirements-completed: [PAY-01, PAY-02, PAY-03]

# Metrics
duration: 35min
completed: 2026-07-15
---

# Phase 3 Plan 4: Ritual-Completed Trigger and Amount-Capture Summary

**Wired the previously-orphaned post-ritual dakshina cards to a real "पूजा संपन्न" tap + free-text amount reply, removed the premature null-amount ledger row from booking-confirm, and rewrote the E2E test to drive the whole loop through the webhook instead of raw-SQL ledger seeding.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-15T22:27:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments
- `buildPostRitualPurohitCard`, `buildPostRitualFamilyCard`, and `buildUpiDeepLink` (all previously flagged as orphaned by 03-VERIFICATION.md) now have real call sites in `whatsapp.ts`.
- Booking-confirm no longer creates a null-amount ledger row; it now sends the existing confirmation text plus a new `buildRitualCompletedCard` ("पूजा संपन्न ✓") prompt.
- A new `ritual-completed:{eventId}` action creates the pending ledger row (amount unset) on first tap, ownership-checked against `event.purohitId`, and is idempotent on repeat taps.
- A free-text amount-capture handler validates the purohit's numeric reply, records it via `recordDakshinaAmount`, builds the UPI deep link from the purohit's own `upiId` (failing closed with an alert on an invalid VPA per CONTEXT.md D-02), and dispatches both post-ritual cards.
- New E2E test drives `booking-confirm -> ritual-completed -> amount reply -> post-ritual cards -> claim -> confirm` entirely through the webhook, asserting zero premature ledger rows and proving both parties receive a card containing a `upi://pay` link and their respective button-reply IDs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add amount-capture primitives to ledger.ts and the ritual-completed prompt card to confirm-card.ts** - `471a7c7` (feat)
2. **Task 2: Wire the ritual-completed trigger and amount-capture reply into whatsapp.ts** - `fb22188` (feat)
3. **Task 3: E2E test driving the full app-triggered dakshina flow (no raw-SQL ledger seeding)** - `408c8ce` (test)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `code/artifacts/api-server/src/lib/ledger.ts` - Added `findAwaitingAmountEntry` (locates a purohit's pending, amount-unset ledger row) and `recordDakshinaAmount` (idempotently records the dakshina amount without touching `paymentStatus`)
- `code/artifacts/api-server/src/lib/confirm-card.ts` - Added `buildRitualCompletedCard`, the purohit-facing "ritual completed" prompt button
- `code/artifacts/api-server/src/routes/whatsapp.ts` - Removed the premature `createLedgerEntry(..., null, ...)` call from `booking-confirm`; added it to send `buildRitualCompletedCard` after the confirmation text; added the new `ritual-completed` action branch; added the free-text amount-capture handler that records the amount, builds the UPI deep link, and dispatches both post-ritual cards
- `tests/api/ledger.spec.ts` - Added `sendWebhookText` helper and a new E2E test exercising the full app-triggered dakshina flow with zero raw-SQL ledger seeding; both prior tests (claim/confirm ownership+idempotency, ops-inspection endpoint) left unmodified and still pass

## Decisions Made
- `recordDakshinaAmount` never changes `paymentStatus` -- it's a value update within the `pending` state, keeping the state-transition surface limited strictly to `claimLedgerEntry`/`confirmLedgerEntry` as required by the plan's out-of-scope boundary.
- `ritual-completed` idempotency mirrors the double-tap pattern already used by `claimLedgerEntry`/`confirmLedgerEntry`: a repeat tap while the ledger row is still pending/amount-unset resends the amount prompt (a helpful nudge) rather than silently no-op'ing, since the purohit may not have seen the first prompt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Split shared try/catch around sequential sendWhatsappMessage calls into per-call try/catch blocks**
- **Found during:** Task 2 (wiring booking-confirm's two sends and the amount-capture handler's two post-ritual card sends)
- **Issue:** The plan's task description said to "wrap this whole new block in its own try/catch," but `sendWhatsappMessage` is documented (in the plan's own Interfaces section) to record the outbound message to the ring buffer and then *throw* `WhatsappSendError` when `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` are unset (true in this test environment). With a single shared try/catch around two sequential awaited sends, the first `sendWhatsappMessage` throwing would abort execution before the second send ever ran -- meaning the family's post-ritual card (and, in booking-confirm, the ritual-completed prompt card) would never be dispatched at all in this environment, silently breaking both the real-world "both parties get a card" behavior and the E2E test's assertion that a family-side outbound entry exists.
- **Fix:** Wrapped each `sendWhatsappMessage` call individually in its own try/catch (matching the existing onboarding-reply-loop pattern already present in this file), so a send failure on one message never blocks subsequent independent sends.
- **Files modified:** code/artifacts/api-server/src/routes/whatsapp.ts
- **Verification:** New E2E test asserts outbound entries exist for both `purohitPhone` and `yajmanPhone` after the amount reply; test passes.
- **Committed in:** fb22188 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for correctness -- without this fix the family card (and the ritual-completed prompt in booking-confirm) would silently fail to send whenever the first message in the sequence throws, which is the normal case in this test/dev environment (no WhatsApp credentials configured). No scope creep; the fix stays entirely within the two call sites the plan specified.

## Issues Encountered
- Several `Edit` tool calls against `whatsapp.ts` failed to match `old_string` on their first attempt when the string spanned lines containing Devanagari text, despite the visible content appearing identical in `Read` output. Worked around by splitting edits into smaller chunks that avoid including Devanagari substrings inside the matched `old_string`. No functional impact -- final file content was verified correct via `Read` and passing typecheck/tests.

## User Setup Required

None - no external service configuration required. (Real WhatsApp send behavior, i.e. actual delivery to a phone, still requires `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` to be set in production, as already documented for the rest of this webhook -- no new env vars introduced by this plan.)

## Next Phase Readiness

Phase 3's Roadmap Success Criteria #1, #2, and #4 (previously FAILED per 03-VERIFICATION.md) are now reachable by a real purohit/family pair:
- SC1: A real purohit tap sequence (booking-confirm -> ritual-completed -> amount reply) results in a post-ritual card with gratitude framing and a UPI deep link to the purohit's own VPA being sent to both purohit and family.
- SC2: The purohit's "Dakshina received" tap and the family's "Confirm" tap are both reachable from a real, app-produced card.
- SC4: The new E2E test proves the complete loop -- booking confirmation, ritual completion, amount entry, purohit claim, family confirmation -- driven entirely through the WhatsApp webhook.
- SC3 (already satisfied prior to this plan) remains untouched: `ledger.ts`'s claim/confirm state-transition logic and its existing tests were not modified.

No known blockers for Phase 3 closure. Recommend re-running phase verification to confirm all 10 observable truths now pass.

---
*Phase: 03-corroborated-dakshina-ledger*
*Completed: 2026-07-15*

## Self-Check: PASSED

All 4 modified/created files verified present on disk; all 3 task commit hashes (471a7c7, fb22188, 408c8ce) verified present in git log.
