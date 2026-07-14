# Phase 1: Platform Foundation & Purohit Onboarding - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

A purohit's first WhatsApp contact (via the landing page's `wa.me` deep link) captures
name, city (geocoded to lat/long + `locality_key`), merchant UPI ID, and calendar system
(purnimanta/amanta) — nothing else is asked before this. Within that same exchange, the
purohit sees a resolved-date wow-moment card before bulk import of a real roster is ever
offered. All captured data persists in real Supabase Postgres (`purohits` table; `yajmans`/
`events`/`ledger` tables stand ready per the fixed schema, even though nothing writes to
them yet in this phase). The bot is registered with Meta as a task-specific agent.

</domain>

<decisions>
## Implementation Decisions

### Utility templates — resolved a real requirements-wording tension
- **D-01:** Onboarding is 100% free-form text/buttons inside the purohit's own 24h
  session (he messages first via the landing page link, so no template is ever needed for
  this phase). ONBD-01's "use registered Utility templates, not free-form broadcast"
  wording is corrected as imprecise blueprint language for this phase — it describes
  Phase 4's cold 6am outbound, not Phase 1's session-bound replies. No Utility template
  submission, Meta review, or template-send code path is built in Phase 1.

### Wow-moment card
- **D-02:** The card shown mid-onboarding uses a **canned/generic example family**
  (resolved via the real Vedika Panchang API, so the date math is real — only the family
  identity is a placeholder). Nothing is written to `yajmans`/`events` in this phase. Real
  family capture (voice/photo extraction) is entirely Phase 2 scope — Phase 1 needs zero
  text-extraction or NLU logic.

### Onboarding flow mechanics
- **D-03:** Partial onboarding state persists keyed by `phone_number` (the `purohits`
  table's `UNIQUE` column per the fixed schema). If a purohit drops off mid-flow and
  messages again later, the bot resumes at the next unanswered field rather than
  restarting the sequence.
- **D-04:** UPI ID validation is **format-check only** (regex against known PSP handle
  shapes, e.g. `name@bankhandle`). No live verification API — matches the $0-infra
  posture and stays clear of anything resembling a payment-gateway dependency, even a
  verification-only one.

### Geocoding
- **D-05:** City name → lat/long → `locality_key` uses **OpenStreetMap Nominatim** (free,
  no API key, single GET returns coordinates directly). Explicitly evaluated against
  Mappls (used in the sibling streethawk project) during this discussion: Mappls' Place
  Search returns an `eLoc`, not lat/long directly, requiring a second resolution hop (see
  `/Users/maulik/streethawk/minibag/packages/shared/services/mappls.js`) plus OAuth
  client-credentials token management and a paid key. That precision buys nothing extra
  for Smaran's need (city-level coordinates for Vedika's Panchang timing + a coarse
  density key) — Nominatim's simpler fit was chosen over stack-consistency with
  streethawk.

### Claude's Discretion
- Exact onboarding question phrasing/order (Hindi/Hinglish tone, which field is asked
  first after name) — no explicit preference captured beyond "name, city, UPI, calendar
  system" per ONBD-01; downstream planner has latitude here.
- Internal state-machine representation (a `status`/`current_step` column on `purohits`
  vs. a separate onboarding-state table) — not discussed, left to the planner given D-03's
  constraint (must resume by phone_number).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 1: Platform Foundation & Purohit Onboarding" — goal, success criteria, requirement IDs
- `.planning/REQUIREMENTS.md` ONBD-01, ONBD-02 — the two locked requirements this phase satisfies (ONBD-01's template wording superseded by D-01 above)

### Fixed schema & negative constraints (from the original blueprint ingest)
- `.planning/intel/constraints.md` §"Database Schema" — the full 4-table `purohits`/`yajmans`/`events`/`ledger` SQL schema; Phase 1 creates all four tables even though only `purohits` gets real writes
- `.planning/intel/constraints.md` §"Negative Constraints (Strict)" — items 1-9, especially #3 (no PSP/payment gateway, informs D-04), #7 (Utility templates only for business-initiated contact, informs D-01), #8 (WhatsApp is the interface, Postgres is the truth), #9 (no custom Panchang engine, Vedika API only)
- `docs/smaran-blueprint-v3.md` Part 6 (source of the SQL schema, lines 97-152), Part 7 (source of the negative constraints)

### Product memory / integration quirks already discovered
- `code/.agents/memory/smaran-product.md` — Vedika sandbox always returns a fixed 1995-01-01 mock (don't assume it varies with input during manual testing); WhatsApp test-mode webhook subscription is a two-step Meta dashboard process (URL+token entry, then separately clicking "Subscribe" on the messages field)

### Existing code this phase extends
- `code/artifacts/api-server/src/routes/whatsapp.ts` — the webhook POST handler currently does `if (msg.type !== "text") continue;` (silently drops non-text) and only logs to an in-memory ring buffer with zero reply logic; Phase 1 adds the reply orchestration + state machine
- `code/artifacts/api-server/src/routes/panchang.ts` — existing Vedika proxy, reusable as-is for the wow-moment card's date resolution
- `code/artifacts/api-server/src/routes/keepalive.ts` — demonstrates the required pattern for touching `@workspace/db` safely: dynamic `import()` gated behind `process.env.DATABASE_URL`, never a static top-level import (that module throws at import time if `DATABASE_URL` is unset — see next ref)
- `code/lib/db/src/index.ts` — `@workspace/db`'s entrypoint; throws immediately if `DATABASE_URL` is unset. Phase 1 is the first phase where `DATABASE_URL` becomes a hard requirement in production (already provisioned per the KB's Deployment section — `smaran-prod`/`smaran-dev` Supabase projects exist)
- `code/lib/db/src/schema/index.ts` — currently empty (`export {}`, comments only); Phase 1 populates this with the four tables from the constraints.md schema
- `code/lib/api-spec/openapi.yaml` + `pnpm --filter @workspace/api-spec run codegen` — the established pattern for adding any new typed request/response contract (see the `/keepalive` addition in `docs/superpowers/plans/2026-07-13-staging-prod-infra.md` Task 2 for a worked example of this exact pipeline)

### Deployment (already live, per this session's verification)
- `knowledgebase/01-Architecture/smaran-platform-architecture.md` §"Deployment" — Render service live, `smaran-prod`/`smaran-dev` Supabase projects exist, `api.smaran.click` resolves. The production Meta WhatsApp webhook is NOT yet registered (blocked on Meta business verification) — Phase 1 implementation can proceed against `smaran-dev` and the existing Meta *test* app/number without waiting on that.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `panchang.ts`'s Vedika proxy — used as-is for the wow-moment card's date resolution, no changes needed
- `keepalive.ts`'s dynamic-import pattern for `@workspace/db` — the template every new route touching the database must follow, since `DATABASE_URL` presence can't be assumed at module-load time in every environment (e.g. the E2E suite still boots without it)
- The OpenAPI→orval codegen pipeline (`lib/api-spec/openapi.yaml` → `pnpm --filter @workspace/api-spec run codegen` → generated zod schemas in `lib/api-zod`) — every new route response should follow this, matching `health`/`panchang`/`whatsapp`/`keepalive`'s existing convention

### Established Patterns
- Env-var-driven sandbox/production switching (`VEDIKA_API_KEY` presence flips `panchang.ts`'s base URL) — the same shape should extend to any Meta test-app-vs-production-app switching this phase needs
- Every route response is `zod.parse()`-validated against a generated schema before sending, even for internal/ops-only endpoints (`keepalive.ts` does this despite having no frontend consumer) — Phase 1's new routes should match this discipline

### Integration Points
- The webhook POST handler (`whatsapp.ts`) is the single entry point every inbound onboarding message arrives through — it currently has zero routing/state logic beyond "is this text, log it." This phase's core work is replacing that with real conversation-state handling keyed by the sender's phone number.

</code_context>

<specifics>
## Specific Ideas

Geocoding comparison against Mappls came from the user's direct prior experience building
`/Users/maulik/streethawk/minibag/packages/shared/services/mappls.js` — verified against
that actual code during discussion (not assumed) before recommending Nominatim instead.

</specifics>

<deferred>
## Deferred Ideas

- Full voice/photo ingestion + NLU extraction — Phase 2 (already roadmapped as ING-01/02/03)
- Utility template submission, Meta review, template-send code path — Phase 4 (already
  roadmapped as BRAIN-01; reconfirmed explicitly in D-01 above as NOT needed in Phase 1)
- Live UPI ID verification API — not deferred to a future phase, decided against
  permanently in D-04 (format-check only, by design, not by time constraint)

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 1.

</deferred>

---

*Phase: 1-Platform Foundation & Purohit Onboarding*
*Context gathered: 2026-07-14*
