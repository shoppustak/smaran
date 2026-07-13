# Context (DOC intel)

Synthesized by gsd-doc-synthesizer · mode: new

Running notes by topic, appended verbatim/paraphrased with source attribution. Includes prose/business context from `smaran-blueprint-v3.md` (Parts 1-4, 8-9 — non-PRD/SPEC portions) and the full content of `ideating-toolset-v1.md` (classified DOC in its entirety).

---

## Topic: Product Vision (Smaran)

Smaran ("remembrance") is a WhatsApp bot that becomes an independent Hindu priest's ledger, calendar, and memory: converts each yajman family's Hindu dates to Gregorian dates, reminds ahead of rituals, generates forwardable cards, detects lapsed families, guards festival-season scheduling against double-booking, and keeps a corroborated dakshina record — money flows directly to the purohit's own UPI, never through the platform. It is a tool for the priest, not a marketplace; families see only their own purohit.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 1, lines 7-13)

---

## Topic: Market & Wedge

- Market: India's religious/spiritual economy is large; micro-payment behavior is well-proven (astrology/devotion platforms). Priest digital fluency is rising.
- Backlash: funded FaithTech incumbents are aggregators — "batch pujas," 50-70% commission margins, commodified ritual, priests treated as commissioned agents.
- Gap: no one serves the existing hereditary purohit ↔ yajman relationship; marketplaces replace the family purohit, Smaran defends him.
- Customer: the independent urban purohit — city-based, self-employed, established yajman roster. Not the village archaka (no wallet) or elite diaspora priest (different economy). Income is seasonal-spiky; anxieties are missed tithi, drifting yajman, double-booked muhurat.
- Verified-facts discipline: two commonly-cited stats explicitly excluded from the case as unverified/non-transferable — "50,000 temples in one district" and "₹72,000/month average purohit income." Pricing rests on ground contact, not either stat.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 2, lines 17-25)

---

## Topic: Value Ladder

Ordered by willingness-to-pay, not build order:
1. REMEMBER — tithi/ritual resolution + reminders (hygiene layer, demo "wow").
2. RECOVER — lapse detection + re-engagement nudge; framed as the highest-value loop, converting the pitch from "reminder app" to "income protection."
3. PROTECT — festival-season schedule defense (day-sheet, conflict warnings).
4. COLLECT — post-ritual dakshina cards with UPI deep link + two-party corroborated ledger.

Succession promise (retention moat, zero code at launch): Smaran commits to preserving the complete bahi khata for handover to the purohit's successor.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 3, lines 29-36)

---

## Topic: Business Model & Revenue Geometry

- Purohit pricing: ₹1,499/year anchor (₹999/year early-bird for seed-ward cohort); ₹149/month fallback only, never default (monthly invites churn given seasonal income).
- Family layer: ₹29/month via UPI autopay — described as load-bearing to the revenue geometry, not optional.
- Back-solve unit: purohit hub (~30 reached families each). Feasible solo seed: 70 activated purohits by end of month 4 in 2-3 temple-dense wards of one city.
- Scenario table (k = referral multiplier, conversion, family attach, M12 MRR):
  - Conservative: k=1.0, conv=25%, attach=3% → ~₹52K MRR
  - Middle: k=1.15, conv=30%, attach=5% → ~₹1.15L MRR
  - Pre-registered: k=1.3, conv=30% @ ₹125/mo-eq, attach=5% → ~₹1.81L MRR
- Honest read: ₹1.5-2L MRR month-12 bar is cleared only at the optimistic edge of every parameter simultaneously. Growth is structurally purohit-to-purohit only (families cannot recruit priests); k is called "the make-or-break number" and is currently unmeasured.
- Pre-registration record (binding): seed 70 purohits by M4, k=1.3, conversion 30% @ ₹1,499/yr, family attach 5% @ ₹29/mo. Voiding thresholds: observed k<1.15 at M4 gate voids the case (reopens kill question); conversion<22% or attach<3% at M8 gate does the same. Parameter revisions require written re-run of the back-solve; a second revision escalates to full registry review.
- Gates: M0-4 seed (density + observed k; revenue ₹0 by design) → M5-8 geometry (conversion + attach + week-8 retention >60%) → M9-12 replicate.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 4, lines 38-57)

---

## Topic: Validation Plan / Decision Fork

Ground contact plan: ~10 independent purohits in the intended seed ward, validating (a) price tolerance for ₹1,499/yr (₹999 early-bird) framed as income protection; (b) family willingness to pay ₹29/month; (c) actual current bahi-khata-keeping habits (validates voice/photo ingestion assumption); (d) sabha/association access for seeding (tests the k=1.3 ambition).

If interviews support the parameters → hand Parts 5-7 to the coding agent; build order: State 1-2 (ingestion + wow) → State 3 (brain + lapse) → State 5 (corroboration) → States 4, 6, 7.
If they don't → Smaran is shelved without a line of code written, per the doc's stated philosophy that "only building before asking is a loss."

Single highest-risk assumption named in the doc: that purohit-to-purohit referral through sabhas can sustain k ≥ 1.3 — "everything else is engineering."

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 9, lines 172-179)

---

## Topic: Idea Screening Framework — Overview

Two-axis framework (`ideating-toolset-v1.md`): vertical axis = seven decoupled innovation principles describing how durable networks form in informal economies; horizontal axis = eight economic filters describing what a 1-5 person team can build/distribute/monetize in ~24 months. An idea qualifies only where both axes intersect. Framework claims calibration via independently producing two passing calibration cases (Tuition Demand Cell, School Exam Archive) and correctly rejecting several control cases.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§0, lines 7-9)

---

## Topic: Idea Screening Framework — Seven Principles (Vertical Axis)

- P1 — The recurring event is the atom: unit is a recurring, time-bound, anchored event/relationship, not an individual.
- P2 — Observe coordination, not transactions: intent captured upstream, before money moves.
- P3 — The instrument must be inert: captures only behaviour people already perform; any shaping prompt contaminates the signal.
- P4 — Demand precedes possession: verify demand → locate supply → engage logistics, in that order.
- P5 — Trust is computed, never declared: reliability inferred from frequency/longevity/corroboration, never ratings.
- P6 — Evidence, never a timeline: discrete corroborated events only; no tracking/continuous surveillance.
- P7 — Networks emerge; they are not installed: growth gated by density (per school/ward/building), not calendar.

Scope note: P1's atom generalizes across group event, recurring relationship, and institutional cycle shapes; solo routines are out of scope. Qualification bar: an idea must draw structurally on ≥3 principles.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§1, lines 13-25)

---

## Topic: Idea Screening Framework — Eight Filters (Horizontal Axis)

- F1 Leanness — buildable by 1-5 people in <6 months, no hardware/inventory/fleet/ops army.
- F2 Pain gravity × frequency — daily/weekly pain already paid for via a workaround.
- F3 Behaviour preservation — near-zero new behaviour; "download our app" is itself a violation in informal India.
- F4 Structural virality — one activation onboards many; marketing spend must not be the growth engine.
- F5 Revenue geometry — small payments × large base, believable path to ₹1.5-2L MRR by month 12, organic-only.
- F6 Moat stack (sort key) — day-one utility AND a compounding asset stacking ≥2 moat types.
- F7 Category wallet — spend sits in a non-negotiable Indian household category (education, child outcomes, health, money/tax, marriage).
- F8 Platform dependency — if a platform is the interface it must never be the system of record.

All eight must pass; F6 additionally ranks survivors.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§2, lines 29-42)

---

## Topic: Moat Taxonomy

Four moats available to a solo builder: (1) time-gated data — accumulates only through lived cycles; (2) corroborated records — facts confirmed by ≥2 independent parties; (3) local density — per-institution completeness; (4) accumulated personal record — switching cost, weakest alone. Ranking rule: 1 moat = feature, 2 = viable, 3-4 = build it.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§3, lines 46-56)

---

## Topic: WhatsApp Medium Screen

For informal-India consumers, WhatsApp defaulting re-scores the axis (F1↑, F3↑↑ zero install, F5↑ free service windows). Hard constraints: official API bots cannot join groups → use hub-and-spoke pattern (1:1 spokes with the bot; user's existing group is the broadcast surface for bot-generated artifacts); only task-specific agents permitted (Meta policy, Jan 2026); never build on unofficial libraries; WhatsApp is interface, never system of record (F8).

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§4, lines 59-67)

---

## Topic: Pipeline / Stage-Gates

Order of operations: (1) Hunt in the intersection of recurring events/relationships/cycles with unrecorded money/trust/obligation inside an F7 wallet; (2) Principle check (≥3 principles load-bearing); (3) Filter screen (all eight pass); (4) Moat rank; (5) Medium fit (express MVP as hub-and-spoke WhatsApp); (6) Reality pass (regulation, incumbent failure modes, IP/gray zones, ground access); (7) Stage-gate the build: M0-4 seed (density + invite rate >1, revenue ₹0 by design) → M5-8 geometry gate (5-10% conversion, >60% wk-8 retention, kill/pivot here not month 20) → M9-12 replicate (₹1.5-2L MRR); $1M ARR is a month 24-30 outcome.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§5, lines 70-78)

---

## Topic: Calibration Cases

Passed: School Exam Archive (stacks all four moats); Tuition Demand Cell / Batch (moats: computed tutor trust graph + time + density; validated by spend data and regulatory tailwind).
Correctly rejected (kept as controls): Milk/press hisaab ("costume" case, ~1 principle), Child record vault (moat type 4 only, a feature not a venture), Mistri reliability graph (fails density economics), College-student crash cohorts (P1 fail, F5 fail — subsidy-dependent), Personal udhaar ledger (F3 fail — recording is socially costly).

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§6, lines 82-93)

---

## Topic: Standing Constraints — Builder Context

Solo/home-studio, organic-only distribution, 2-3 seed localities maximum in year one, ₹25L ARR run-rate as the honest month-12 ceiling; leading indicators (density, invite rate, corroboration volume) prioritized over trailing ones (revenue) for the first two quarters.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§7, lines 97-99)

---

## Topic: Generative Heuristics (Sourcing Ideas)

Applied at pipeline step 1 (Hunt), before scoring:
- H1 — Atom shape determines virality geometry: cohorts/hubs have k>1 by construction, dyads have k<1 unless a hub sits behind the dyad.
- H2 — Hunt embedded payers, not convenience payers: payer whose own income depends on the tool converts at embedded-class rates (~30%) vs convenience-class (~10-15%).
- H3 — Informality has two species; only legal-but-unrecorded behaviour is huntable. Rule: whenever observed behaviour involves pooled money, the legal read moves from pipeline step 6 to step 1.
- H4 — Byproduct adjacency check: a moat that adjacent infrastructure already emits as exhaust is not a moat.
- H5 — Capital-substitution check: prefer atoms funded startups structurally cannot substitute (institutional cycles) over service relationships on-demand supply can replace.
- H6 — Regulation is a sourcing query, not a risk line-item: actively search recent rules pushing demand toward small/informal/verifiable formats.

Composed template (§8.1): legal-but-unrecorded behaviour (H3), inside a non-negotiable wallet (F7), anchored to an institutional cycle (H5, P1), cohort/hub-shaped atom (H1), embedded payer (H2), record no adjacent infrastructure emits as exhaust (H4). Unexplored template wallets named: health, marriage, religious/community institutions (festival and society calendars).

Maintenance rule (§8.2): a heuristic enters §8 only with a named calibration event behind it.

source: /Users/maulik/smaran/docs/ideating-toolset-v1.md (§8, lines 103-126)
