# Phase 7: Referral & Growth Instrumentation - 07-03-SUMMARY

Date: 2026-07-16
Author: Antigravity

## Summary of Changes

All objectives of the gap-closure plan `07-03-PLAN.md` have been successfully completed:

1. **Re-engineered observed-k Telemetry Logic (G1, G2, G3)**:
   - Rewrote the SQL query inside `code/artifacts/api-server/src/routes/metrics.ts` to compute the growth telemetry as an attributable viral coefficient:
     - Denominator (`cohortSize`) is now the count of onboarded (activated) purohits inside the cohort week.
     - Numerator (`referredActivations`) is the count of referred onboarded (activated) purohits whose referrers signed up in that cohort week.
     - Referred activations are grouped by the REFERRER's cohort signup week rather than the referred's signup week.
     - Self-referrals are securely excluded to prevent telemetry tampering.
     - The calculation is now unbounded and correctly computes values exceeding `1.0` (matching the roadmap's growth gate telemetry `k >= 1.3`).

2. **Added Sweep and Telemetry Schedulers (G4)**:
   - Implemented route endpoints `/cron/subscription-sweep` and `/cron/observed-k` inside `code/artifacts/api-server/src/routes/cron.ts`, authenticated with the secure `X-Cron-Secret` header.
   - Declared daily and weekly cron services in `render.yaml` to hit these endpoints.

3. **Formatted Deliverable Referral Card Invite Links (G5)**:
   - Rewrote `buildReferralCard` in `confirm-card.ts` to output the invite link within the body text as a clickable URL, rather than burying it inside the reply button ID (which WhatsApp does not support opening).

4. **Wrote Rigorous Referral and Isolation E2E Tests (G6)**:
   - Updated `tests/api/referral.spec.ts` to verify the new unbounded and referrer-attributed cohort calculations. The test seeds a referrer 1 week ago and completes two referred onboarding flows today, successfully asserting that `observedK` for the referrer cohort is `2.0` (exceeding 1.0) and that the activations attribute to the referrer's signup week.

## Verification Status
- Full Playwright E2E suite executed and successfully passes:
  ```text
  Running 26 tests using 4 workers
    26 passed (59.2s)
  ```
