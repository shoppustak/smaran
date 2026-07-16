# Phase 7: Referral & Growth Instrumentation - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Referral & Growth Instrumentation calculates organic loop metrics to check if the product can scale via peer invitations (observed k).

- **Referral Card (GROW-01):** An on-demand interactive card generated when a purohit requests it (using `"referral"` or `"आमंत्रण"` commands). The card contains a deep-link url pointing to the bot's own WhatsApp number: `https://wa.me/bot-number?text=invite:${purohitId}`.
- **Onboarding Link Capture (GROW-02):** When a new user launches onboarding and sends the pre-filled message `invite:{referrerId}`, the system extracts the referrer's UUID. It populates `referred_by_purohit_id` on the newly onboarding purohit's DB record.
- **Observed-k Cohort Calculation (GROW-03):** A weekly background or cron task groups active purohits by their creation week. It calculates `observed k = referred activations / active referrers` to measure growth metrics.

</domain>

<decisions>
## Implementation Decisions

### Metric API
- **D-01:** Cohort calculations are exposed via `GET /metrics/observed-k` gated by header check of `X-Internal-Key` matching `INTERNAL_API_KEY`, preventing public exposure of growth data.

### Referrer UUID Validation
- **D-02:** When parsing `invite:{referrerId}`, the system asserts that the referrer's ID exists in the `purohits` table. If the ID is invalid or cannot be parsed, onboarding proceeds but the `referred_by_purohit_id` field is set to null (T-07-01).

</decisions>

<canonical_refs>
## Canonical References

- `docs/smaran-blueprint-v3.md` Part 5, State 7 (Referral: k-instrumentation)
- `docs/smaran-blueprint-v3.md` Part 6 (Database Schema: `purohits.referred_by_purohit_id`)
- `.planning/ROADMAP.md` Phase 7 details and success criteria
- `.planning/REQUIREMENTS.md` GROW-01, GROW-02, GROW-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `code/lib/db/src/schema/purohits.ts`: Referral column `referredByPurohitId`.
- `code/artifacts/api-server/src/routes/whatsapp.ts`: Onboarding webhook starting point.

</code_context>
