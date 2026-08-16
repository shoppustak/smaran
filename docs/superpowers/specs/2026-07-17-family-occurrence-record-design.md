# Family Occurrence Record — Design

**Date:** 2026-07-17
**Status:** Draft, awaiting review
**Origin:** Canvas review of the WhatsApp flow found screen 14 (`14-family-subscribed.png`) dead-ends. A family activates a ₹21/month subscription and receives nothing afterward.

---

## The problem, in two halves

### Half 1 — the family lane delivers nothing

`yajmans.family_sub_status = 'active'` is **write-only**. Two readers exist:

- `subscription.ts:81` — the lapse cron, which reads `active` only to flip it to `lapsed`.
- `whatsapp.ts:772` — checks `=== "none"` to decide whether to *offer* a subscription.

Nothing reads `active` in order to **deliver**. Blueprint Part 5, State 6 promises the family "their own tithis and festival dates, reminded directly, always in their purohit's name." That is unbuilt.

This matters beyond fairness to the family. Part 4 calls the family layer "load-bearing, not optional" — the M12 revenue geometry does not close without a 5% family attach rate, and the M8 gate voids the case below 3%. Attach is being measured against a tier that currently ships silence.

### Half 2 — the occurrence history does not exist (and this breaks RECOVER)

Investigating where family history would come from surfaced a larger defect.

`events.last_performed_year` is written by **no production code path**. The extraction schema (`extraction.ts:8-27`) captures `maas`, `paksha`, `tithi_name` — there is no year field. The only writers are test fixtures (`brain.spec.ts:77`, `schedule.spec.ts:94`), which set the column directly via SQL.

Real ingested events therefore carry `last_performed_year = NULL`. Lapse detection (`brain.ts:369`) filters:

```ts
.where(lt(eventsTable.lastPerformedYear, currentYear))
```

SQL three-valued logic: `NULL < 2026` evaluates to `NULL`, not `TRUE`. The row is excluded. **Every ingested event is invisible to lapse detection.** The test suite is green because fixtures supply the column that ingestion never populates.

RECOVER is blueprint priority #2 — "the highest-value loop… one recovered yajman pays for years of subscription… this is what converts the pitch from 'reminder app' (convenience) to 'income protection' (embedded)." It currently fires on zero real events.

**The two halves share one root cause.** The family's remembrance record and the purohit's recovery loop both need per-year occurrence history. Neither has it.

---

## Scope decomposition

Three sub-projects. Each gets its own plan and implementation cycle.

| # | Sub-project | Depends on | Why separable |
|---|---|---|---|
| **A** | Occurrence history capture | — | Fixes RECOVER on its own merits. Unblocks C. Touches ingestion, schema, purohit confirm flow. |
| **B** | Family delivery lane | — | Reminders + on-demand list. Needs no history. Fully parallel to A. |
| **C** | Family remembrance record | A | Renders what A captures, into the lane B builds. |

**Build order: A first** (it repairs the highest-value loop and unblocks C), B in parallel, C last.

A is the priority even if the family tier were cancelled tomorrow.

---

## Sub-project A — Occurrence history capture

### New table

`last_performed_year` is a scalar that cannot express "six years running." Replace it as the source of truth with a per-occurrence row.

```sql
CREATE TABLE occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  yajman_id UUID NOT NULL REFERENCES yajmans(id),
  purohit_id UUID NOT NULL REFERENCES purohits(id),
  cycle_year SMALLINT NOT NULL,
  performed_on DATE,                     -- nullable: bahi khata often gives year only
  source TEXT NOT NULL,                  -- 'bahi_khata' | 'ledger' | 'manual'
  ledger_id UUID REFERENCES ledger(id),  -- set when source = 'ledger'
  attested_by TEXT NOT NULL,             -- 'purohit' | 'both'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, cycle_year)
);
```

**`attested_by` is load-bearing.** Imported bahi khata history is purohit-asserted only. Ledger-derived occurrences are two-sided (State 5: `pending → claimed → corroborated`). These are different epistemic classes and the schema must not silently merge them — the corroborated ledger is described in the blueprint as "a deposit into the relationship record," and that claim is only true for rows both parties touched.

**`UNIQUE (event_id, cycle_year)`** prevents a bahi-khata import and a ledger row from double-counting the same ritual.

### Keeping `last_performed_year`

Retain the column as a maintained denormalized cache (`MAX(cycle_year)` per event), written on every occurrence insert. Rationale: it is named in the blueprint's Part 6 schema, and keeping it bounds the blast radius on `brain.ts`. It stops being a source of truth.

### Extraction changes

- Add `years_performed: number[] | null` to `ExtractionResultSchema` per entry.
- Extend the system prompt to read year columns and tally marks from bahi khata pages — the pages frequently carry them; the current extractor discards this into nothing.
- Surface extracted history in the purohit's confirm card: *"Kartik satyanarayan katha — 6 saal: 2020, 2021, 2022, 2023, 2024, 2025"*.

**Vision models will hallucinate years.** The existing confirm gate is the guard, and the blueprint's rule holds unchanged: "the AI drafts, the priest ratifies" (State 2). No occurrence row is written without the purohit's tap. History is corrective-editable through the same `CORRECTABLE_VOCAB_FIELDS` path as the other fields.

### Lapse detection rewrite

Replace the NULL-unsafe scalar comparison with an occurrence-existence check:

> An event is lapsed when it has **no occurrence row for the current `cycle_year`** and its resolved date for this cycle has already passed.

This is NULL-safe by construction, correct for events with no recorded history (currently silently skipped), and expresses the actual intent — the current query only approximates it.

**Test debt:** `brain.spec.ts` and `schedule.spec.ts` fixtures insert `last_performed_year` directly. They must be rewritten to seed `occurrences`, or they will keep certifying a path production never takes. This is the defect that hid the bug; the plan must not reproduce it.

---

## Sub-project B — Family delivery lane

### What the family gets for ₹21/month

The family already receives pre-ritual cards today, forwarded by the purohit. The paid delta is **directness and agency**:

1. **Direct reminders.** The 6:00 AM brain (State 3) fans out family-addressed reminders for yajmans where `family_sub_status = 'active'` — their tithis and festivals, not only purohit-booked rituals.
2. **On-demand list.** Family texts `mera saal` / `mera mahina`; receives their year or month of resolved tithis. Mirrors the purohit's "my week" day-sheet (State 4).

### Hard constraints

- **No payment links on any family calendar or reminder surface, ever.** State 3: "a shraddh reminder with a UPI link reads as an invoice for remembrance, the exact commercialization the wedge stands against." The dakshina card remains the only surface carrying a UPI link.
- **FAM-03 isolation.** Every family-side query is scoped through `yajman.purohitId`. Inbound family number → yajman lookup → only that yajman's rows, only that purohit's attribution. No discovery, comparison, or contact with any other purohit. This is a read-path projection filter on existing `events` rows, not new storage.
- **Gating.** `family_sub_status !== 'active'` → respond with the subscription offer card, not the list. Reuses the existing offer path at `whatsapp.ts:772`.
- **Attribution.** Every card names the purohit. Blueprint State 6: "always in their purohit's name."

---

## Sub-project C — Family remembrance record

Family requests their record (`mera smaran`, or a button on the calendar card). Receives occurrences grouped by event:

> **कार्तिक सत्यनारायण कथा**
> 2020 · 2021 · 2022 · 2023 · 2024 · 2025 · 2026 — *7 वर्ष*

### What it must not contain

**No amounts. No payment history. Not ever.** A dakshina statement is the invoice-for-remembrance violation accrued over time, and State 5 rule 3 is explicit that the family's confirm corroborates *occurrence*, never amount. The record is a remembrance asset, not a billing statement.

This is the succession promise (Part 3) turned toward the family: the same accumulated record the purohit hands to his successor, reflected back to the household whose rituals compose it.

---

## Testing

- **A:** Extraction eval cases with year-bearing bahi khata pages. Lapse detection tests seeded via `occurrences` — never by direct `last_performed_year` writes. A regression test asserting an event with NULL history is *not* silently skipped.
- **B:** FAM-03 isolation tests — a family number querying another purohit's yajman must be refused. Gating tests for each of `none` / `active` / `lapsed`. An assertion that no family calendar or reminder payload contains a `upi://` string.
- **C:** Grouping and ordering. An assertion that no amount field reaches a family-side payload.

---

## Open questions for review

1. **Bahi khata year density is unverified.** The design assumes pages commonly carry year-by-year entries. This is an assumption drawn from the blueprint's Verma-family narrative, not from inspected pages. It should be checked against real ingestion samples before A is planned in detail — if the pages don't carry years, A collapses to the seed-from-scalar fallback and C launches thin.
2. **Should imported (`attested_by = 'purohit'`) history be visually distinguished from corroborated history in the family's record?** The data keeps them separate regardless. Rendering them identically is simpler and reads better; rendering them distinctly is more honest. Recommend rendering identically at launch, since the purohit ratified every imported row.
3. **`06-CONTEXT.md` is stale** — cites ₹29/month in FAM-01 and D-01. Live price is ₹21 (shagun revision #1). Doc-only fix, but it is a canonical reference and should not be cited from in its current state.
