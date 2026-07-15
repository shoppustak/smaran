# Phase 2: Bahi Khata Ingestion — Cross-Review Feedback

**Date:** 2026-07-15
**Source:** External review of planning docs (post plan-checker pass, plans 02-01 through 02-11)
**Status:** To be incorporated via `/gsd-plan-phase 2 --reviews`

Findings verified against actual plan text before being recorded here — all confirmed real,
not reviewer misreads.

---

## F-3 [BLOCKER] — 02-08 Task 2: no webhook message-id dedup, state-corrupting on redelivery

Meta redelivers webhooks even after a 200 response. A redelivered `audio`/`image` message
currently triggers a second `createIngestJob` + full pipeline run: double ASR/LLM spend, two
confirm cards, and — worst case — the existing "re-record supersedes" logic in Task 2 rejects
the *original* job, possibly the one the purohit is mid-confirm on.

**Fix:** Add a processed-`msg.id` check to 02-08 Task 2's action text before execution. An
in-memory ring buffer is sufficient at this scale, or a column/index keyed on the inbound
WhatsApp message id (dedupe window matched to Meta's redelivery window, not permanent storage).

---

## F-4 [BLOCKER] — 02-07/02-08: photo path's multi-family job model is unspecified

`02-04`'s `vision.ts` returns `{ families: ExtractionResult[]; truncated: boolean }` — an
array. But `ingest_jobs.extraction` (02-01, per spec §9) holds one extraction; `02-07`'s
pipeline step (g) persists "the extraction" singular; `02-08`'s `confirmJob` reads
`job.extraction` as a single-family shape with one `confirm:{jobId}` reply id. Nobody
specifies how one photo containing three families becomes three confirmable units.

Spec §10 ("one confirm card per family, sent sequentially") implies the answer: **one
`ingest_job` per detected family** — the photo webhook path spawns N sibling jobs from one
vision call, each carrying one family's extraction, each with its own confirm card and job id.

**Fix:** Write this job-splitting design into 02-07 explicitly (the photo branch of the B→G
pipeline creates N `ingest_jobs` rows from one vision response, not one). Confirm 02-08's
existing single-job confirm/reject logic then applies unchanged to each sibling job — it
should not itself need multi-family awareness once 02-07 does the split.

---

## F-5 [FIX] — 02-09: `GET /ingest-jobs/:id` is unauthenticated, inconsistent with Phase 1 precedent

Phase 1 established the `X-Internal-Key` header-gate precedent on `GET /purohits/:phoneNumber`
(`01-04-PLAN.md`, checked before the DB gate). `02-09`'s `GET /ingest-jobs/:id` has no auth
check at all. The response body is deliberately PII-minimal, but error strings populated with
`String(err)` (and `AsrError` carrying upstream response bodies) could leak transcript
fragments in edge cases.

**Fix:** Add the same `X-Internal-Key` header check to `GET /ingest-jobs/:id`, checked before
the DB gate, matching `01-04`'s exact pattern. `POST /ingest-jobs/purge` staying unauthenticated
is fine as-is (matches `/keepalive`'s existing $0-infra posture — worst case a repeat call is a
harmless no-op).

---

## F-6 [BLOCKER] — 02-09: stale `awaiting_confirm` jobs retain religious personal data indefinitely

The purge job only targets `status IN ('confirmed','rejected','failed')` older than 30 days.
D-03 defers reminder nudges to Phase 4, so a job whose purohit simply went quiet sits in
`awaiting_confirm` forever — transcript and extraction fully intact, never touched by the
purge. Spec §8's retention table says transcript lives "30 days (debugging window)," full
stop — the implementation as planned quietly narrows that to "30 days after terminal," which
contradicts the retention promise stated on the landing page / sabha pitch.

**Fix:** Inside 02-09's existing purge task, also expire `awaiting_confirm` jobs older than N
days (matching or shorter than the 30-day window): transition to `rejected` with
`error: 'expired'`, then null `transcript`/`extraction` same as the terminal-status path.

---

## Nit 1 — 02-05: `grep -c "graph.facebook.com" = 2` acceptance criterion will fail correct code

The criterion checks the literal string count in the *source file* `media.ts`. Per §3's
two-step fetch, the first request hits a hardcoded `graph.facebook.com/.../mediaId` URL
(one literal occurrence in source) — the second fetch hits the *resolved* media URL returned
by the first response (often a different host, e.g. a lookaside CDN), which is a runtime
variable, not a second hardcoded literal. Correct code has exactly ONE source-level occurrence
of the string, not two.

**Fix:** Change the criterion to `grep -c "graph.facebook.com" ... >= 1` plus a separate check
that `fetch` (or equivalent) is called twice (e.g. `grep -c "await fetch(" ... = 2`, or an
explicit two-call structural check) to actually prove the two-step fetch shape.

---

## Nit 2 — 02-08: `confirmJob` doesn't verify job ownership before writing

Webhook signature verification is deferred (T-01-01, accepted risk). Given that, job-id
ownership is the only remaining check standing between a spoofed/misdirected interactive
payload and a write to the permanent record. `confirmJob` currently resolves the purohit
*from* `job.purohitId` but never cross-checks that against the purohit resolved from the
inbound message's `msg.from` — nothing stops a `confirm:{jobId}` reply naming a job that
belongs to a different purohit.

**Fix:** In `confirmJob`, assert `job.purohitId === purohit.id` (the purohit resolved from
`msg.from` in the webhook handler) before proceeding to any write; reject/no-op with a log
if they don't match.

---

## Not carried into this REVIEWS.md (handled separately)

- **Finding 1** (bake-off/eval-corpus/ground-contact-interview dependency chain) — real, but
  is a field-work scheduling concern, not a plan defect. Not tracked here per project owner's
  call; not blocking replan.
- **Finding 2** (`locality_key` city-level granularity propagating from Phase 1's geocoding
  into every Phase 2 write) — real, but the fix lives in Phase 1 (`01-02-PLAN.md`), not Phase
  2. Being handled as a direct Phase 1 plan revision in parallel with this replan.
