# Phase 6: Family Calendar Subscription - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The Family Calendar Subscription introduces a recurring revenue stream directly linked to the purohit's yajman roster.

- **Family Calendar Subscription Offer (FAM-01):** Interactive cards dispatched to yajman family contacts surface a subscription offer: `"अपने परिवार का पंचांग और अनुष्ठान कैलेंडर..."`. The card embeds a dynamic UPI Autopay deep link priced at ₹29/month.
- **Subscription Tracking (FAM-02):** The `yajmans` table columns `family_sub_status` (none, active, lapsed, cancelled) and `family_sub_renews_at` store subscription states. A background checker identifies expired active records and updates them to `lapsed`.
- **Strict Purohit Lock-In Isolation (FAM-03):** The family-side workflow must NEVER enable discovery, comparison, or contact with any other purohit. A family contact can only query, confirm, or subscribe under their direct associated purohit's configuration.

</domain>

<decisions>
## Implementation Decisions

### Mandate URL Scheme
- **D-01:** Autopay mandate URLs utilize the standard merchant recurring parameters (`recur=MONTHLY`, `am=29.00`) mapped to the associated purohit's merchant VPA, ensuring funds route directly without passing through the platform.

### Webhook Sub Callback
- **D-02:** Subscription activations will be simulated or processed via webhook notifications that update `family_sub_status = "active"` and extend `family_sub_renews_at` by 30 days.

### Strict Isolation Assertion
- **D-03:** Webhook routing asserts that any incoming yajman message payload matches the associated `yajman.purohitId` relationship. If a family tries to access or interact with event/ledger records owned by another purohit, access is aborted.

</decisions>

<canonical_refs>
## Canonical References

- `docs/smaran-blueprint-v3.md` Part 5, State 6 (Family calendar subscription)
- `docs/smaran-blueprint-v3.md` Part 6 (Database Schema: `yajmans` table subscription columns)
- `.planning/ROADMAP.md` Phase 6 details and success criteria
- `.planning/REQUIREMENTS.md` FAM-01, FAM-02, FAM-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `code/lib/db/src/schema/yajmans.ts`: Subscription columns `familySubStatus` and `familySubRenewsAt`.
- `code/artifacts/api-server/src/routes/whatsapp.ts`: Webhook router routing family-side confirmations.

</code_context>
