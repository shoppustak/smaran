# Phase 2: Bahi Khata Ingestion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 02-bahi-khata-ingestion
**Areas discussed:** Voice/vision AI pipeline, Confirmation UX flow, Gotra/tithi field normalization, DPDP consent handling

---

## Voice/vision AI pipeline

### Q1: Voice transcription approach

| Option | Description | Selected |
|--------|-------------|----------|
| OpenAI Whisper API | Cheap, handles Hindi/Hinglish code-switching, single HTTP call | |
| WhatsApp's own media + hosted STT | Functionally same choice as above, different framing | |
| Defer to Claude's discretion | Let planner pick based on cost/quality during implementation | |
| **Other (user free text)** | Pointed to `docs/ref-state-2-plan.md` — a full technical spec already exists | ✓ |

**User's choice:** Referred to `docs/ref-state-2-plan.md` ("Smaran — State 2 Technical Specification: Voice Ingestion"), a pre-existing detailed spec covering the entire pipeline.
**Notes:** This single answer resolved not just ASR provider (Sarvam Saaras v3 primary, OpenAI transcribe fallback, via adapter interface) but most of the phase's implementation detail — canonical vocabulary tables, fuzzy-match thresholds, confirm-card UX, retention policy, schema addendum, and build-order spikes. Discussion shifted from open-ended questioning to confirming/locking the spec's contents.

### Q2: Extraction-model choice (LLM for Stage E text-extraction + §10 photo-vision)

| Option | Description | Selected |
|--------|-------------|----------|
| Claude Sonnet 5 | Native vision, structured JSON-mode output, near-Opus quality at Sonnet cost | |
| Claude Opus 4.8 | Higher accuracy ceiling for messy handwriting, higher cost | |
| Defer to Claude's discretion / eval harness | Extend §11's bake-off to also test extraction model | |
| **Other (user free text)** | Proposed a 3-way bake-off: Claude Haiku 4.5, Gemini Flash, Sarvam-M | ✓ |

**User's choice:** Extend §11's eval harness with a fourth column (extraction model alongside ASR provider); bake off Claude Haiku 4.5, Gemini Flash, and Sarvam-M on per-field accuracy — no pre-committed vendor.
**Notes:** User flagged their own recommendation of Claude Haiku 4.5 as coming from an Anthropic-built assistant and explicitly said the harness, not preference, should decide. Also noted a secondary consideration: if Sarvam-M clears the 90% accuracy bar, pairing it with Saaras ASR gives an end-to-end in-India, zero-retention pipeline — a stronger DPDP/trust narrative than a mixed-vendor pipeline — worth weighing if accuracy is close between candidates.

### Continue check
"Next area" selected — spec doc's depth meant no further questions needed for this area.

---

## Confirmation UX flow

### Q1: Stale unconfirmed jobs and zero-extraction handling

| Option | Description | Selected |
|--------|-------------|----------|
| No reminder in Phase 2; zero-extraction gets apology + re-record prompt | Keeps scope tight; stale-job nudges are a Phase 4 lapse-recovery concern | ✓ |
| Stale jobs get a WhatsApp reminder after 24h | Adds scheduled-job dependency overlapping Phase 4's Daily Brain scheduler | |
| Other / describe | | |

**User's choice:** No reminder in Phase 2 for stale jobs; zero-extraction reuses the existing `failed` status plus a friendly retry message.
**Notes:** None.

### Continue check
"Next area" selected — rest of confirm-card flow already locked by §6.

---

## Gotra/tithi field normalization

### Q1: Confirm §5.2/5.3 as locked

| Option | Description | Selected |
|--------|-------------|----------|
| Locked as-is | Use §5.2/5.3's canonical tables and thresholds verbatim | ✓ |
| Other / describe | | |

**User's choice:** Locked as-is.
**Notes:** No open gaps identified in the spec's normalization rules.

---

## DPDP consent handling

### Q1: Consent posture for Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Defer `consent_status` to a later phase | No family-side contact point exists yet; §8's retention policy already gives real DPDP minimization | ✓ |
| Add `consent_status` column now, populate as pending/implied | Schema-only change now, capture flow still deferred | |
| Other / describe | | |

**User's choice:** Defer entirely — no schema change, no capture flow, in Phase 2.
**Notes:** Rationale: consent capture requires a family-side contact surface that doesn't exist yet in this WhatsApp-only, purohit-facing product.

---

## Claude's Discretion

- Exact Hindi-language WhatsApp prompt wording beyond what §3/§6 specify verbatim
- `ingest_jobs` queue implementation details (polling vs event-driven) not specified beyond the status enum
- Whether the transcode sidecar (§4 Spike 1) is built at all — contingent on Spike 1's outcome

## Deferred Ideas

- Stale/unconfirmed job reminder nudges — Phase 4 (BRAIN-02 lapse recovery)
- `consent_status` capture at family-side first contact — a future phase that builds a family-side surface
