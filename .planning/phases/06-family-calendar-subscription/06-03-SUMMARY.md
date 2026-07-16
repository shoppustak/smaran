# Phase 6: Family Calendar Subscription
## Plan 03: Gap Closure — Remove Payment Webhook, Real Offer Dispatch, Scheduled Sweep

### Execution Summary
Closed all 7 gaps from the 2026-07-16 goal-backward audit. ROADMAP Phase 6 SC1–3 now hold in
substance, and the product constraint "no webhook-driven payment state" is upheld.

- **G1 (CRITICAL) — deleted the payment webhook.** Removed the `req.body.type === "mandate_activation"`
  handler from `whatsapp.ts` entirely. No inbound webhook can set `family_sub_status`.
- **G1/G6 — ownership-checked activation.** Added `activateSubscriptionForYajman(yajmanId, purohitId)`
  in `subscription.ts`: loads the yajman, throws on `yajman.purohitId !== purohitId`, then sets
  `active` + `family_sub_renews_at = now()+30d`. The `subscribe-confirm:{yajmanId}` interactive
  handler resolves the sender's own yajman and passes `senderYajman.purohitId`, so a family can only
  activate under their own purohit.
- **G2 — offer actually dispatched.** On family `ledger-confirm`, when `familySubStatus === "none"`,
  `buildFamilyCalendarOfferCard` is sent to the family number (`whatsapp.ts:683`).
- **G3 — openable link.** The autopay `upi://mandate` link is delivered in the card body; the button
  carries `subscribe-confirm:{yajmanId}`, not the URL in a reply id.
- **G4 — renewal nudge as Utility template.** `runSubscriptionStateCheck` now sends the
  `smaran_renewal_nudge` template (via the shared `sendWhatsappTemplate`) to each lapsing family.
- **G5 — scheduled sweep.** Added `POST /cron/subscription-sweep` (X-Cron-Secret gated) in `cron.ts`
  and a `smaran-subscription-sweep` Render cron (`30 1 * * *`) in `render.yaml`.
- **G7 — E2E rewritten.** `subscription.spec.ts` drives the real post-ritual → offer dispatch →
  tap-activation → backdate → sweep → lapsed + template flow, plus a cross-purohit isolation case
  (subscribe-confirm for another purohit's yajman leaves status `none`). No `mandate_activation`.

### Verification
- `pnpm --dir code --filter @workspace/api-server run typecheck` — clean.
- `npx playwright test subscription referral` — 4 passed (subscription flow + isolation + referral).
- `grep mandate_activation` — no matches anywhere.

### Threats
- T-06-05 (eliminated): unauthenticated payment webhook deleted.
- T-06-06/07 (mitigated): activation + all family interaction ownership-checked to the sender's purohit.
- T-06-09 (mitigated): subscription-sweep cron gated by X-Cron-Secret.

### Status
- **Tasks Complete:** 5/6 (Task 6 git-hygiene checkpoint tracked separately).
- **Completed On:** 2026-07-16
