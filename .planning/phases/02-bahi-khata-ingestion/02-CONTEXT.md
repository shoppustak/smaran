# Phase 2: Bahi Khata Ingestion - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

A purohit builds out their full yajman roster and event history by voice note or by
photographing their bahi khata — never a typed sequential form. Per
`docs/ref-state-2-plan.md`, the pipeline is: WhatsApp voice note / photo → media
download → ASR (voice only) → LLM extraction (JSON-mode, closed-vocabulary prompt) →
fuzzy-match/normalize against canonical tables → confidence-gated confirm card → on
purohit confirm, write to `yajmans`/`events` (never before). Nothing extracted reaches
the permanent record without an explicit tap.

</domain>

<decisions>
## Implementation Decisions

### AI pipeline
- **D-01:** ASR is **Sarvam Saaras v3** (primary, `model: "saaras:v3"`, batch REST,
  India-resident processing, zero retention) with **OpenAI transcribe** as a
  config-switchable fallback, both behind a single `AsrProvider` adapter interface —
  no call site imports a provider SDK directly. Locked by `docs/ref-state-2-plan.md`
  §4.
- **D-02:** The extraction-model choice (Stage E's LLM call, and §10's vision call for
  photos) is **not pre-committed** — it is decided empirically by extending §11's eval
  harness with a fourth column (extraction model alongside ASR provider), bake-off
  candidates: **Claude Haiku 4.5**, **Gemini Flash**, and **Sarvam-M**. Selection
  criterion is per-field accuracy (≥90% acceptance bar per §11), not preference.
  Sarvam-M carries a secondary consideration if it clears the bar: paired with Saaras
  ASR, the entire pipeline would process in-India with zero retention end-to-end — a
  stronger DPDP/trust narrative than a mixed-vendor pipeline, worth weighing if field
  accuracy is close.
- Both spikes in §12 (OGG→Saaras direct feasibility; 3-photo vision-extraction quality
  read) must run before the eval harness bake-off, per the spec's own build order.

### Confirmation UX
- **D-03:** Stale `awaiting_confirm` jobs (purohit went quiet) get **no reminder nudge
  in Phase 2** — that's a lapse-recovery concern matching BRAIN-02's shape, deferred to
  Phase 4 rather than duplicated here.
- **D-04:** Zero-field extraction (garbled audio, unreadable photo) reuses the
  existing `ingest_jobs.status = 'failed'` path plus a friendly re-record/re-photograph
  prompt — no new status or retry-scheduling logic needed.
- Everything else in the confirm-card flow (interactive card format, ✓/✏ buttons,
  per-field confidence gating with `❓` prompts, numbered correction list with 3
  nearest canonical candidates + free-text fallback, multi-family sequential cards,
  re-record supersedes) is locked verbatim by `docs/ref-state-2-plan.md` §6.

### Gotra/tithi/maas/paksha normalization
- **D-05:** Locked as-is per `docs/ref-state-2-plan.md` §5.2–§5.3: canonical
  variant tables ship as data files (not prose); per-field Levenshtein thresholds
  (maas/tithi/paksha ≤2 edits, gotra ≤1 edit, family_name never auto-corrected); gotra
  no-match stores as-heard rather than forcing to nearest list entry (a wrong gotra on
  a shraddh card is a serious insult per the spec's own framing).

### DPDP consent
- **D-06:** `consent_status` capture (per `.planning/intel/constraints.md`'s "consent
  at family-side first contact") is **deferred to a later phase** — Smaran is
  WhatsApp-only and purohit-facing; no family-side contact surface exists yet to
  capture consent from. Phase 2's DPDP minimization story rests on
  `docs/ref-state-2-plan.md` §8's retention policy instead (audio bytes deleted
  immediately after transcription succeeds; raw transcript and extraction JSON purged
  30 days after confirm/reject; confirmed fields are the only permanent artifact, with
  deletion-on-request as a built cascade, not a manual promise).

### Claude's Discretion
- Exact wording/copy for Hindi-language WhatsApp prompts beyond what §3/§6 already
  specify verbatim.
- Internal `ingest_jobs` queue implementation details (polling vs event-driven
  transition between `received → transcribed → extracted → awaiting_confirm`) not
  specified by the doc beyond the status enum itself.
- Whether the transcode sidecar (§4 Spike 1) is needed at all — contingent on Spike
  1's outcome, which the planner/executor should treat as a build-order gate, not a
  pre-decided yes/no.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Voice/photo ingestion pipeline (primary spec for this phase)
- `docs/ref-state-2-plan.md` — the full State 2 Technical Specification: pipeline
  stages A–H, ASR adapter interface, extraction JSON shape, canonical vocabulary
  tables (maas/tithi/paksha/gotra) with fuzzy-match thresholds, confirm-card UX,
  retention policy (§8), schema addendum (§9), photo-path delta (§10), eval harness
  (§11), and build order with spikes (§12). **Supersedes the Blueprint for State 2
  where they conflict, per this doc's own header note.**
- `docs/smaran-blueprint-v3.md` Parts 5–7 — source document `ref-state-2-plan.md` is
  a companion/agent-ready spec for; read for broader product context if
  `ref-state-2-plan.md` is silent on something.

### Roadmap & requirements
- `.planning/ROADMAP.md` §"Phase 2: Bahi Khata Ingestion" — goal, success criteria,
  requirement IDs (ING-01, ING-02, ING-03)
- `.planning/REQUIREMENTS.md` ING-01, ING-02, ING-03 — the three locked requirements
  this phase satisfies

### Fixed schema & negative constraints
- `.planning/intel/constraints.md` §"Database Schema" — the base `purohits`/
  `yajmans`/`events`/`ledger` schema this phase extends per
  `docs/ref-state-2-plan.md` §9's addendum (new `ingest_jobs` table; `label`,
  `source`, `ingest_job_id` columns on `events`; `source` column on `yajmans`)
- `.planning/intel/constraints.md` §"Negative Constraints (Strict)" — DPDP Act 2023
  note on gotra/death-anniversary data as religious personal data (informs D-06)

### Phase 1 artifacts this phase builds on
- `.planning/phases/01-platform-foundation-purohit-onboarding/01-CONTEXT.md` — D-05's
  Nominatim geocoding decision, D-03's phone-number-keyed resumable state pattern
  (the `ingest_jobs` status enum in this phase follows the same resumability
  philosophy)
- `.planning/phases/01-platform-foundation-purohit-onboarding/01-PATTERNS.md` — the
  DB-gating pattern (`if (process.env.DATABASE_URL) { await import("@workspace/db") }`)
  and external-API-proxy shape (env-gated base URL, `fetch` → `.ok` check → zod
  validation) that any new route/adapter in this phase should follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1's WhatsApp webhook handler (`code/artifacts/api-server/src/routes/whatsapp.ts`)
  — the single inbound entry point; this phase adds `messages[].type == "audio"` and
  image-message routing alongside Phase 1's text-message onboarding routing
- Phase 1's dynamic-import DB-gating pattern (`keepalive.ts`) — the template every new
  route/adapter touching `@workspace/db` (including the new `ingest_jobs` table) must
  follow

### Established Patterns
- Every new external-API adapter (ASR provider, extraction LLM) should follow the
  `panchang.ts`-style shape: env-var-gated base URL/key, `fetch` → `if (!ok)` → log +
  error, `.parse()` against a generated zod schema — matching
  `docs/ref-state-2-plan.md` §4's own adapter-interface requirement (no direct
  provider-SDK imports outside the adapter)
- OpenAPI → orval codegen pipeline (`lib/api-spec/openapi.yaml` →
  `pnpm --filter @workspace/api-spec run codegen`) — any new internal endpoint this
  phase needs (e.g. eval harness invocation, ops inspection of `ingest_jobs`) should
  follow this established contract-first pattern

### Integration Points
- `ingest_jobs` status transitions are the new state machine this phase introduces,
  parallel to but distinct from Phase 1's `onboarding_state` — both are
  resumable-by-identity design (phone number for onboarding, `ingest_job_id` for
  ingestion), but do not share a table

</code_context>

<specifics>
## Specific Ideas

The entire voice/photo pipeline design — stage breakdown, ASR vendor rationale, JSON
extraction shape, canonical vocabulary tables with exact Devanagari variants, confirm
card copy in Hindi, retention table, and build-order spikes — comes directly from
`docs/ref-state-2-plan.md`, which the user pointed to explicitly during discussion
rather than having these re-derived. Treat that document as authoritative over any
paraphrase in this CONTEXT.md.

</specifics>

<deferred>
## Deferred Ideas

- Stale/unconfirmed `ingest_jobs` reminder nudges — belongs with Phase 4's lapse
  recovery (BRAIN-02), not duplicated in Phase 2 (D-03)
- `consent_status` capture at family-side first contact — no family-side surface
  exists yet; deferred until a phase that builds one (D-06)

### Reviewed Todos (not folded)
None — `todo.match-phase` returned zero matches for Phase 2.

</deferred>

---

*Phase: 2-Bahi Khata Ingestion*
*Context gathered: 2026-07-14*
