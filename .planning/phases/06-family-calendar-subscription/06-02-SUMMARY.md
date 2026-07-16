# Phase 6: Family Calendar Subscription
## Plan 02: Offer Card, Webhook Isolation & E2E

### Execution Summary
- Added `buildFamilyCalendarOfferCard(yajmanId, purohitName, VPA)` in `confirm-card.ts` — Devanagari
  offer body ("अपने परिवार का पंचांग…", "₹29/माह (UPI Autopay)") carrying the `upi://mandate` deep
  link, with a `सदस्यता लें` / `मैंने सदस्यता ले ली` button whose id is `subscribe-confirm:{yajmanId}`.
- Wired family-side webhook routing in `whatsapp.ts`:
  - FAM-03 isolation block: a family (yajman) sender's interactive/text resource id is checked
    against `ledgerTable.purohitId` / `eventsTable.purohitId`; cross-purohit access → HTTP 403.
  - Offer dispatch: after a family corroborates a ritual (`ledger-confirm`), if
    `familySubStatus === "none"` the offer card is sent to that family.
- Added `tests/api/subscription.spec.ts` covering offer-card shape and the cross-purohit isolation
  block.

### Follow-up
- A goal-backward audit (2026-07-16) found this plan shipped a green test but (a) reintroduced a
  forbidden webhook-driven payment state (`mandate_activation`), (b) never dispatched the offer, and
  (c) never scheduled the lapse sweep or sent a renewal template. Those gaps are closed in Plan 03
  (06-03). This summary documents the 06-02 code as originally landed; see 06-03-SUMMARY for the
  corrected end state.

### Status
- **Tasks Complete:** 3/3 (superseded in part by 06-03)
- **Completed On:** 2026-07-15
