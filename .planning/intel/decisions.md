# Decisions (ADR intel)

Synthesized by gsd-doc-synthesizer · mode: new

## Summary

**No formal ADRs were present in this ingest batch.** Neither classified document (`ideating-toolset-v1.md` = DOC, `smaran-blueprint-v3.md` = SPEC) carries ADR frontmatter, a Status field (Accepted/Proposed), or a Context/Decision/Consequences structure. Nothing here is eligible for LOCKED precedence treatment.

---

## Candidate Decisions (Unformalized — NOT LOCKED)

The classifier flagged `smaran-blueprint-v3.md` Part 7 ("Negative Constraints — Agent Doc C, strict") as reading like permanent architectural rules ("NO ... ever") despite lacking ADR structure. Recorded here for visibility only. These are **not** treated as LOCKED decisions by the precedence engine — they are extracted as SPEC-type protocol constraints in `constraints.md` instead, per the doc's actual classification.

If the project wants these enforced with LOCKED precedence in future ingests (i.e. immune to override by any later SPEC/PRD/DOC), they should be re-authored as proper ADRs with `locked: true` and re-ingested.

| # | Candidate rule | Source |
|---|---|---|
| 1 | No marketplace, ratings, search, matching, or discovery — ever | smaran-blueprint-v3.md, Part 7 item 1 |
| 2 | No consumer app or web UI (WhatsApp-only interface) | smaran-blueprint-v3.md, Part 7 item 2 |
| 3 | No payment gateways or PSP checkout — raw UPI deep links only | smaran-blueprint-v3.md, Part 7 item 3 |
| 4 | No webhook-driven payment states — social corroboration only | smaran-blueprint-v3.md, Part 7 item 4 |
| 5 | No samagri commerce | smaran-blueprint-v3.md, Part 7 item 5 |
| 6 | No diaspora/NRI payment flows in v1 | smaran-blueprint-v3.md, Part 7 item 6 |
| 7 | No marketing blasts — registered Utility templates only | smaran-blueprint-v3.md, Part 7 item 7 |
| 8 | No system of record on WhatsApp — PostgreSQL is the truth | smaran-blueprint-v3.md, Part 7 item 8 |
| 9 | No custom Panchang engine — Vedika API only | smaran-blueprint-v3.md, Part 7 item 9 |

Full text of each rule preserved verbatim in `constraints.md` under type `protocol`.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 7, lines 154-164)
