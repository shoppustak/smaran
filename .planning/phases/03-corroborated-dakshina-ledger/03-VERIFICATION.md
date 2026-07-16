---
phase: 03-corroborated-dakshina-ledger
verified: 2026-07-15T22:35:48Z
status: verified
score: 10/10 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 3: Corroborated Dakshina Ledger — Verification Report

**Phase Goal:** Every dakshina payment is recorded only when both the purohit and the family have independently corroborated it — closing the milestone's core success loop (onboard → log event → corroborated payment).
**Verified:** 2026-07-15
**Status:** verified
**Re-verification:** Yes — verified after Phase 03-04 completion

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Post-ritual card w/ gratitude framing + UPI deep link to purohit's own VPA is sent after ritual date passes or purohit taps "completed" (Roadmap SC1 / PAY-01) | ✓ VERIFIED | `ritual-completed` trigger + amount-capture reply in `whatsapp.ts` now successfully captures amount and dispatches `buildPostRitualPurohitCard` / `buildPostRitualFamilyCard`. |
| 2 | Purohit taps "Dakshina received", family independently taps "Confirm" (occurrence only, not amount) (Roadmap SC2 / PAY-02) | ✓ VERIFIED | Buttons are successfully dispatched and reachable by real users via the post-ritual card dispatch. |
| 3 | Ledger row reaches `corroborated` only after BOTH taps land; no payment webhook exists anywhere; no single side's assertion can mark a row paid (Roadmap SC3 / PAY-03) | ✓ VERIFIED | State machine strictly enforces two-party corroboration. |
| 4 | A real purohit can be walked through onboard → log event → corroborated dakshina end to end (Roadmap SC4) | ✓ VERIFIED | E2E tests updated to drive the full loop via webhook triggers instead of direct SQL seeding. |
| 5 | UPI deep links generated via `upi://pay` scheme with pa/pn/am/tn/cu params (Plan 03-01) | ✓ VERIFIED | `upi.ts:buildUpiDeepLink` produces correctly-encoded URLs and is invoked by the amount-capture handler. |
| 6 | Ledger state machine strictly enforces `pending→claimed→corroborated`, ownership checks, idempotent double-taps (Plan 03-01) | ✓ VERIFIED | Confirmed via `ledger.ts` ownership and state-transition checks. |
| 7 | Webhook routes `ledger-claim`/`ledger-confirm` payloads to state machine with ownership verification (Plan 03-02) | ✓ VERIFIED | Webhook handles colon-delimited action IDs and verifies matching `purohitId` and `yajmanId`. |
| 8 | `GET /ledger/:id` gated by `X-Internal-Key`, response matches OpenAPI schema (Plan 03-03) | ✓ VERIFIED | 401 on wrong key, 404 on missing id, schema validation successful. |
| 9 | `pnpm --dir code run typecheck` exits 0 | ✓ VERIFIED | All 5 workspace projects report "Done", exit 0. |
| 10 | `tests/api/ledger.spec.ts` E2E suite exists and passes | ✓ VERIFIED | Tests pass, and now fully exercise the end-to-end post-ritual trigger loop without raw-SQL insertion. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `code/artifacts/api-server/src/lib/upi.ts` | `buildUpiDeepLink` | ✓ VERIFIED | Exists, correct in isolation, called in app code |
| `code/artifacts/api-server/src/lib/ledger.ts` | `createLedgerEntry`, `claimLedgerEntry`, `confirmLedgerEntry` | ✓ VERIFIED | Exists, substantive, wired into `routes/whatsapp.ts`; E2E-tested |
| `code/artifacts/api-server/src/lib/confirm-card.ts` | `buildPostRitualPurohitCard`, `buildPostRitualFamilyCard` | ✓ VERIFIED | Exists, substantive template (correct Hindi copy, correct payload IDs), called in `whatsapp.ts` |
| `code/artifacts/api-server/src/routes/whatsapp.ts` | Webhook handlers routing `ledger-claim`/`ledger-confirm` | ✓ VERIFIED | Routing/ownership/idempotency verified; buttons are produced by the `ritual-completed` flow. |
| `tests/api/ledger.spec.ts` | E2E integration test suite | ✓ VERIFIED | Passes; fully covers post-ritual dispatch loop. |
| `code/artifacts/api-server/src/routes/ledger.ts` | `GET /ledger/:id` route | ✓ VERIFIED | Registered in `routes/index.ts`, gated, schema-validated, E2E-tested |
| `code/lib/api-spec/openapi.yaml` | `ledger` tag + `GET /ledger/{id}` path | ✓ VERIFIED | Path present with `X-Internal-Key` header param, schema correct |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `code/artifacts/api-server/src/routes/whatsapp.ts` | `code/artifacts/api-server/src/lib/upi.ts` | `buildUpiDeepLink(...)` invocation | ✓ WIRED | Confirmed present in amount-capture handler. |
| `code/artifacts/api-server/src/routes/whatsapp.ts` | `code/artifacts/api-server/src/lib/ledger.ts` | `claimLedgerEntry`/`confirmLedgerEntry` calls | ✓ WIRED | Confirmed present and functioning (E2E) |
| `code/artifacts/api-server/src/routes/whatsapp.ts` | `code/artifacts/api-server/src/lib/confirm-card.ts` | `buildPostRitualPurohitCard`/`buildPostRitualFamilyCard` | ✓ WIRED | Wired via the `ritual-completed` and free-text amount-capture handler. |

### Behavioral Spot-Checks / Independently Re-Run Verification

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Workspace typecheck | `pnpm --dir code run typecheck` | All 5 projects report "Done", exit 0 | ✓ PASS |
| Ledger E2E suite | `DATABASE_URL=... INTERNAL_API_KEY=... npx playwright test ledger` | Passed (3/3 tests) | ✓ PASS |
| No TODO/FIXME/XXX/HACK/placeholder markers in phase files | grep across `ledger.ts`, `upi.ts`, `confirm-card.ts`, `routes/ledger.ts`, `routes/whatsapp.ts`, `tests/api/ledger.spec.ts` | none found | ✓ PASS |
| No payment-gateway webhook in the path | grep for razorpay/stripe/payu/cashfree/paytm/PSP across `routes/` | none found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAY-01 | 03-01, 03-02, 03-04 | Post-ritual card w/ gratitude framing, UPI deep link, purohit "Dakshina received" tap | ✓ SATISFIED | Card builder + UPI link builder invoked via the `ritual-completed` webhook trigger. |
| PAY-02 | 03-02, 03-04 | Family "Confirm" tap corroborates ritual occurrence only, opens service window | ✓ SATISFIED | Handler logic correct and reachable via the newly wired cards. |
| PAY-03 | 03-01, 03-03 | State machine enforces `pending→claimed→corroborated`, no path from single side, no payment webhooks | ✓ SATISFIED | Confirmed in code and via E2E test. |

No orphaned requirements — REQUIREMENTS.md maps only PAY-01/02/03 to Phase 3, and all three are claimed across the three plans.

### Anti-Patterns Found

None found. Previous issues concerning orphaned functions and null-amount hardcoding have been resolved in plan 03-04.

### Human Verification Required

None structurally missing. A human should visually confirm the Hindi card copy renders correctly in a real WhatsApp client, now that the card is sent during the ritual completion flow.

### Gaps Summary

All previously identified gaps have been resolved. The headline deliverable — the dispatch of the post-ritual card with gratitude framing and a dakshina UPI deep link — is successfully wired up. 

The `whatsapp.ts` webhook handler now features:
- A `ritual-completed` trigger that prompts for the amount and idempotently creates a pending ledger row.
- A free-text amount-capture handler that confirms the dakshina amount, builds the correct UPI link, and dispatches the corresponding post-ritual cards to both the purohit and the family.

Consequently, `tests/api/ledger.spec.ts` now fully exercises this real app-triggered dakshina flow without raw SQL seeding, validating both the occurrence verification and the payment corroboration steps.

---

_Verified: 2026-07-15_
_Verifier: Claude (gsd-verifier) [Re-run after 03-04]_
