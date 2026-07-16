# Phase 3: Corroborated Dakshina Ledger - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Every dakshina payment in Smaran is recorded only when both the purohit and the family have independently corroborated it. This closes the core milestone loop (onboard → log event → corroborated payment). 

There are no payment gateways, PSP checkouts, or webhook-driven payment states in this system. Raw UPI links settle directly to the purohit's own Virtual Payment Address (VPA), so no bank or payment provider ever communicates with Smaran. 

Payment state is tracked in the `ledger` table through the status progression:
`pending → claimed` (purohit asserts receipt) `→ corroborated` (family confirms ritual occurred)

- The **purohit** enters the amount and claims receipt ("Dakshina received ✓").
- The **family** confirms that the ritual took place ("Confirm ✓"). Their confirmation verifies the occurrence of the ritual only, never the monetary amount.
- A ledger row reaches the `corroborated` state only when both parties have registered their confirmation. No single side's assertion alone can mark a row as paid.

</domain>

<decisions>
## Implementation Decisions

### UPI Deep Link Scheme
- **D-01:** UPI deep links will be generated using the standard `upi://pay` URI scheme rather than integrating external checkout SDKs, preserving zero-commission direct-to-bank settlement (conforming to Part 7 constraint 3).
- **D-02:** The VPA used for generating the deep link is resolved dynamically from the associated purohit's own record in the database. If a purohit has not configured a valid VPA during onboarding, payment actions fail-close with an alert.

### Interactive Callbacks
- **D-03:** Webhook button taps for confirming and claiming payments are routed asynchronously. 
- **D-04:** Strict ownership checks are enforced: the replying sender's phone number parsed from WhatsApp messages must match the associated purohit or yajman records. Cross-account claims/confirmations are silently discarded (T-03-01/T-03-03).
- **D-05:** Taps are designed to be idempotent. Double-taps are handled as no-ops rather than triggering duplicate database writes or state-machine errors.

### DPDP Act & Privacy
- **D-06:** Although payment corroboration is a social assertion, the family-side confirmation tap also functions to open a free WhatsApp customer service window (Part 5, State 5). We will ensure the yajman's consent status is tracked inside the `yajmans` table to prepare for upcoming DPDP requirements (part of Part 8 compliance).

</decisions>

<canonical_refs>
## Canonical References

- `docs/smaran-blueprint-v3.md` Part 5, State 5 (Collect: two-party corroborated payments)
- `docs/smaran-blueprint-v3.md` Part 6 (Database Schema: `ledger` table columns)
- `docs/smaran-blueprint-v3.md` Part 7 (Negative Constraints: raw UPI only, no commission, no PSP checkouts, no webhooks)
- `.planning/ROADMAP.md` Phase 3 details and success criteria
- `.planning/REQUIREMENTS.md` PAY-01, PAY-02, PAY-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `code/artifacts/api-server/src/lib/whatsapp-client.ts`: The outbound messaging helper, supporting both text and interactive button payloads.
- `code/artifacts/api-server/src/routes/whatsapp.ts`: The primary incoming webhook entry point.
- `code/lib/db/src/schema/ledger.ts`: The Drizzle database schema defining the `ledger` table with all needed columns (`purohitId`, `yajmanId`, `eventId`, `amountCollected`, `paymentStatus`, `purohitClaimedAt`, `familyConfirmedAt`, `localityKey`).

</code_context>

<specifics>
## Specific Ideas

- **Hindi Copy Guidelines:** Post-ritual templates must present highly respectful Sanskrit/Hindi phrasing (e.g. using `📿 अनुष्ठान`, `दक्षिणा अर्पण`, and `पुष्टि करें`).
- **Isolation Boundaries:** Ensure that yajman contacts cannot access, view, or compare any other purohit's configuration or details (locked negative constraint).

</specifics>
