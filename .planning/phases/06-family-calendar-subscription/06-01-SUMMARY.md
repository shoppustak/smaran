# Phase 6: Family Calendar Subscription
## Plan 01: Subscription Core Utilities

### Execution Summary
- Created `code/artifacts/api-server/src/lib/subscription.ts` implementing:
  - `buildAutopayDeepLink` to dynamically build UPI Autopay mandate deep links with monthly recurring parameters of ₹29.00 mapped to the merchant VPA.
  - `runSubscriptionStateCheck` to scan the yajman records, find active subscriptions where the renewal timestamp is in the past, and transition their status to `"lapsed"`.
- Implemented dynamic database gating by using dynamic imports of `@workspace/db` inside the state check function.
- Hand-verified code structure and types to ensure clean compilation. Note: typecheck command execution timed out waiting for user confirmation approval.

### Status
- **Tasks Complete:** 2/2
- **Completed On:** 2026-07-15
