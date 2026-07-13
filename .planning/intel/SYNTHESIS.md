# Synthesis Summary

Produced by gsd-doc-synthesizer · mode: new · date: 2026-07-13

## Docs Synthesized

2 documents classified and synthesized:

| Doc | Type | Confidence | Source |
|---|---|---|---|
| The Ideating Toolset — v1.0 | DOC | medium | docs/ideating-toolset-v1.md |
| SMARAN — The Complete Blueprint (v3.0) | SPEC | medium | docs/smaran-blueprint-v3.md |

No ADRs, no standalone PRDs. Both source docs had empty `cross_refs` — no cycle detection findings.

## Synthesis Methodology Note

`smaran-blueprint-v3.md` was classified SPEC overall, but its classifier notes flagged it as internally mixing four content modes across nine parts (business/market prose, PRD-like product requirements, a literal SQL schema, and strict "negative constraints" that read like locked architectural rules but lack ADR structure). Per the classifier's explicit recommendation, this synthesizer split the document by section rather than filing it monolithically under one intel type:

- Part 5 ("Product Requirements — Agent Doc A") → `requirements.md`, as 7 discrete requirements (REQ-purohit-onboarding through REQ-referral-k-instrumentation)
- Part 6 (SQL schema) and Part 7 (Negative Constraints) → `constraints.md`, typed `schema`, `protocol`, `api-contract`, `nfr`
- Parts 1-4, 8-9 (vision, market, value ladder, business model, compliance, validation plan) → `context.md`
- Part 7 also cross-noted in `decisions.md` as an unformalized candidate-decisions list (NOT LOCKED — the classification record has `locked: false` and no ADR type, so it carries no precedence weight; flagged for the project to formalize as real ADRs if locked enforcement is wanted later)

`ideating-toolset-v1.md` (DOC) was extracted in full into `context.md` as ten topic entries (framework overview, seven principles, eight filters, moat taxonomy, medium screen, pipeline, calibration cases, standing constraints, generative heuristics).

## Decisions Locked

0. No ADR-type documents were present in this ingest batch. See `decisions.md` for a list of 9 unformalized candidate rules extracted from `smaran-blueprint-v3.md` Part 7 (explicitly NOT locked/precedence-eligible).

## Requirements Extracted

7 requirements, all sourced from `smaran-blueprint-v3.md` Part 5:
REQ-purohit-onboarding, REQ-voice-photo-ingestion, REQ-daily-brain-scheduling, REQ-schedule-protection, REQ-corroborated-payments, REQ-family-calendar-subscription, REQ-referral-k-instrumentation.

## Constraints

12 constraint entries across 4 types, from `smaran-blueprint-v3.md`:
- api-contract: 1 (core platform stack — WhatsApp Cloud API, Supabase, Vedika API, UPI deep links, Meta task-specific agent registration)
- schema: 1 (4-table Postgres schema: purohits, yajmans, events, ledger)
- protocol: 9 (strict negative constraints, Part 7 items 1-9)
- nfr: 1 (DPDP compliance, Meta registration discipline, domain requirements — Part 8)

## Context Topics

14 topic entries in `context.md`: 5 from `smaran-blueprint-v3.md` (Product Vision, Market & Wedge, Value Ladder, Business Model & Revenue Geometry, Validation Plan / Decision Fork) and 9 from `ideating-toolset-v1.md` (Framework Overview, Seven Principles, Eight Filters, Moat Taxonomy, WhatsApp Medium Screen, Pipeline / Stage-Gates, Calibration Cases, Standing Constraints, Generative Heuristics).

## Conflicts

0 blockers, 0 competing-variants, 0 auto-resolved. See `.planning/INGEST-CONFLICTS.md` for full report (empty — "No conflicts detected").

## Files

- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
- `.planning/INGEST-CONFLICTS.md`

This file is the entry point for `gsd-roadmapper`.
