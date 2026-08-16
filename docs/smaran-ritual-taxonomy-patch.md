# Smaran — Ritual Taxonomy Patch (State-2 Spec Delta)
### Full `event_type` enum, recurrence classification, Hindi labels, extraction vocab
*v1.0 · Patches `docs/ref-state-2-plan.md` §5.1–§5.2 and `confirm-card.ts`'s label map. Research-verified against the 16-samskara framework and common purohit practice.*

---

## §1 — The design decision

**`event_type` stays a flat, comprehensive enum. Recurrence is a separate derived property, not a second free-typed field.** A category split (`event_category` + `event_type`) was considered and rejected for now — it adds extraction surface for a distinction only lapse-detection needs, and lapse-detection only needs a boolean. If a real feature later wants full samskara/occasional/ancestral grouping, it can derive that from `event_type` via the lookup table below without a schema change.

**Not every ritual enters the *active* extraction vocabulary on day one.** Rare-today samskaras (Keshanta, Samavartana) go to `other` + purohit free-text correction, tracked as backlog demand — adding them to the prompt now is extraction noise for events that will almost never occur in a solo builder's seed cohort.

---

## §2 — The full enum

`SMALLINT`-backed lookup table `event_types` (not a Postgres native enum — see §5 for why), each row carrying `code`, `label_hi`, `is_recurring`, `active_in_extraction`.

### Tier 1 — active extraction vocabulary (ships now)

| code | Hindi label | Recurs? | Notes |
|---|---|---|---|
| `shraddh` | श्राद्ध | ✓ | highest-stakes; fortnight-critical |
| `birthday` | जन्मदिन | ✓ | janma divas |
| `anniversary` | वर्षगांठ | ✓ | wedding/other annual anniversary |
| `satyanarayan_katha` | सत्यनारायण कथा | ✓ | often annual by family custom |
| `navratri_sthapana` | नवरात्रि स्थापना | ✓ | the gap flagged in the last review |
| `ganesh_sthapana` | गणेश स्थापना | ✓ | Ganesh Chaturthi |
| `diwali_lakshmi_puja` | दीवाली लक्ष्मी पूजा | ✓ | many families book their purohit specifically |
| `saraswati_puja` | सरस्वती पूजा | ✓ | |
| `griha_devta_puja` | गृह देवता / गृह लक्ष्मी पूजा | ✓ | family deity, annual |
| `griha_pravesh` | गृह प्रवेश | ✗ | housewarming, one-time per property |
| `vastu_shanti` | वास्तु शांति | ✗ | space correction |
| `bhoomi_puja` | भूमि पूजा | ✗ | groundbreaking |
| `vahan_puja` | वाहन पूजा | ✗ | new vehicle |
| `dukan_udghatan` | दुकान उद्घाटन पूजा | ✗ | shop opening |
| `namkaran` | नामकरण | ✗ | naming (samskara) |
| `mundan` | मुंडन | ✗ | first haircut (samskara) |
| `annaprashan` | अन्नप्राशन | ✗ | first solid food (samskara) |
| `upanayan` | उपनयन (जनेऊ) | ✗ | sacred thread (samskara) |
| `vivaha` | विवाह | ✗ | wedding (samskara) |
| `engagement` | सगाई / रोका | ✗ | pre-wedding |
| `navagraha_shanti` | नवग्रह शांति | ✗ | planetary remedy, on-demand |
| `pitru_paksha_shraddh` | पितृ पक्ष श्राद्ध | ✓ | distinct from a family's individual shraddh tithi — 15-day window, own logic (§4) |
| `other` | अन्य | — | catch-all; surfaces backlog demand |

### Tier 2 — backlog (recognized on purohit free-text correction only, not in the active prompt)

Garbhadhan, Pumsavana, Simantonnayana/godh bharai, Jatakarma, Nishkraman, Karnavedh, Vidyarambha, Vedarambha, Keshanta, Samavartana, Chaturthikarma, Antyeshti (deliberately excluded from active extraction — a death is never something the purohit "books" via voice note in the same flow as a birthday; if this ever needs digital support it deserves its own careful, separately-designed flow, not a dropdown value), Pind Daan, Tarpan (standalone), Seemantha, Rudra Abhishek, Sankashti/monthly Ekadashi puja.

**Promotion rule:** a Tier-2 type promotes to Tier 1 when it appears via `other` + correction ≥5 times across the seed cohort — real demand signal beats guessing.

---

## §3 — `is_recurring` and lapse detection

```sql
-- replaces the bare TEXT event_type column
CREATE TABLE event_types (
  code TEXT PRIMARY KEY,
  label_hi TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL,
  active_in_extraction BOOLEAN NOT NULL DEFAULT true
);
-- events.event_type becomes a FK: event_type_code TEXT NOT NULL REFERENCES event_types(code)
```

Lapse detection (per the occurrence-history rewrite already in flight) filters to `is_recurring = true` events only — a one-time griha pravesh or a namkaran should never generate a "lapsed" nudge; there is nothing to recur. This closes a second latent version of the same bug class the occurrence-history review just fixed: a scalar/boolean check silently misclassifying events it was never designed to handle.

---

## §4 — Pitru Paksha special case

`pitru_paksha_shraddh` is recurring but on a *window*, not a single resolved tithi like standard shraddh — it's a purohit's family-wide ancestor-honoring booking within the 15-day period. Flag for the daily-brain planner (Phase 4/BRAIN): this needs its own reminder cadence logic (a window-open nudge, not a single-date reminder), not the standard per-tithi cron match. Noted here as a dependency, not solved here.

---

## §5 — Why a lookup table, not a native Postgres/Drizzle enum

Native enums require a migration to add a value. A lookup table lets the promotion rule in §2 add a Tier-2 type by inserting a row — no schema migration, no deploy, matching the repo's existing "expand variant tables, don't touch model choice" philosophy from the eval-harness bake-off discipline. `active_in_extraction` is the flag the extraction-prompt builder reads to decide what's in-vocabulary today.

---

## §6 — Extraction & fuzzy-match wiring

- Extraction prompt's `event_type` field (§5.1 of the State-2 spec) now enumerates Tier-1 `code`s only, with each `label_hi` as the spoken-form hint.
- **New vocab file** `vocab/event-type.ts`, same `VocabEntry[]` shape as maas/tithi/paksha, spoken variants per type (e.g. `shraddh`: श्राद्ध, बरसी, पुण्यतिथि; `birthday`: जन्मदिन, बर्थडे; `navratri_sthapana`: स्थापना, घटस्थापना, कलश स्थापना). Threshold: `EVENT_TYPE_MAX_EDITS = 2`, same tier as maas/paksha — closed set, safe to auto-correct.
- Confirm-card's numbered-event line template (§6, "१. {event_type_hindi} — {label} — …") now reads `label_hi` from the lookup table instead of a hardcoded switch — one join, no more label drift between the schema and the card.
- `other` and any below-threshold event-type match render with the same `❓` gate as any other low-confidence field (§6's existing rule) — never silently filed as `other`.

---

## §7 — What this does NOT change

No change to State 4 (Protect), State 5 (Collect/corroboration), the occurrence-history design, or any negative constraint. This is purely a vocabulary-completeness patch to Stage E/F and the confirm-card's rendering layer.

---
*v1.0 — Tier 1 ships in the next extraction-prompt revision; Tier 2 is backlog, promoted by evidence, not by request.*
