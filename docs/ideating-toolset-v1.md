# The Ideating Toolset — v1.0
### A screening framework for solo-buildable, defensible ventures in informal India
*Derived from the LocalLoops Theory of Commerce (Mehta, 2026); refined through candidate screening, July 2026.*

---

## 0. What this is

Two axes and a pipeline. The **vertical axis** supplies the physics — seven decoupled innovation principles that describe how durable networks form in informal economies. The **horizontal axis** supplies the economics — eight filters that describe what a 1–5 person team can build, distribute, and monetize inside ~24 months. An idea qualifies only where both axes intersect. The toolset is calibrated: it independently produced the Tuition Demand Cell and the School Exam Archive, and correctly rejected the control cases (§6).

---

## 1. Vertical Axis — The Seven Principles

| # | Principle | One-line test |
|---|---|---|
| P1 | **The recurring event is the atom** | Is the unit a recurring, time-bound, anchored event/relationship — not an individual? People change; the routine persists. |
| P2 | **Observe coordination, not transactions** | Is intent captured upstream, when people organize/oblige, before money moves? |
| P3 | **The instrument must be inert** | Does the product capture only behaviour people already perform? Any prompt/catalogue/rating that shapes the signal contaminates it. |
| P4 | **Demand precedes possession** | Is anything held on speculation? Verify demand → locate supply → engage logistics, in that order. |
| P5 | **Trust is computed, never declared** | Is reliability inferred from frequency, longevity, corroboration — never ratings? Computed trust accumulates at the speed of lived relationships and cannot be bought. |
| P6 | **Evidence, never a timeline** | Discrete corroborated events only. No tracking, no continuous surveillance. The line between intelligence and surveillance. |
| P7 | **Networks emerge; they are not installed** | Is growth gated by density (per school / ward / building), not calendar? An early-flipped network is engineered, and engineered networks collapse when subsidy stops. |

**Scope note (learned):** P1's atom generalizes across three shapes — the *group event* (tuition batch, committee), the *recurring relationship* (worker–household, tenant–landlord), and the *institutional cycle* (the school exam). Solo routines (habit trackers, personal ledgers) are outside scope: no virality, no graph. **Qualification bar: an idea must draw structurally on ≥3 principles** — fewer means it's a generic startup wearing the thesis as a costume.

---

## 2. Horizontal Axis — The Eight Filters

| # | Filter | Pass condition |
|---|---|---|
| F1 | **Leanness** | Buildable by 1–5 people in <6 months. No hardware, inventory, fleet, or ops army. Watch India's hidden capex: operations headcount. |
| F2 | **Pain gravity × frequency** | Daily/weekly pain, felt as lost money, time, or stress. Test: does the user already pay a workaround (cash, time, jugaad)? |
| F3 | **Behaviour preservation** | Near-zero new behaviour. Slots into an existing routine. "Download our app" is itself an F3 violation in informal India (see §4). |
| F4 | **Structural virality** | Use inherently involves others — one activation onboards many (hub-and-spoke, cell, or intergenerational loop). Marketing spend must not be the growth engine. |
| F5 | **Revenue geometry** | Small payments × large base, arithmetic stated upfront: believable path to ₹1.5–2L MRR by month 12, organic-only. Payment must be more frictionless than non-payment (UPI autopay ₹49–199, or per-use <₹20). |
| F6 | **Moat stack** *(sort key — see §3)* | Day-one single-player utility AND a compounding asset stacking ≥2 moat types. Utility funds the present; the asset defends the future. |
| F7 | **Category wallet** | Spend sits in a non-negotiable Indian household category: education, child outcomes, health, money/tax, marriage. F2 measures hurt; F7 measures whether the wallet opens. |
| F8 | **Platform dependency** | If a platform (Meta, UPI stack, app store) is the interface, it must never be the system of record. Graph, ledgers, and trust records live on owned backend; a channel ban must not kill the asset. |

**All eight must pass.** F6 additionally *ranks* the survivors.

---

## 3. The Moat Taxonomy (F6 expanded — the sort key)

Only four moats are available to a solo builder. Features, UX, price, and AI-wrappers are indefensible by definition; capital, brand, and license moats are out of reach.

1. **Time-gated data** — accumulates only through lived cycles (terms, months, seasons). Capital cannot compress the calendar; a later entrant is structurally behind by the difference in start dates.
2. **Corroborated records** — facts confirmed by ≥2 independent parties. Cannot be scraped, bought, or synthesized; corroboration *is* the value.
3. **Local density** — per-institution completeness. 90% of one school beats 5% of every school. Rewards the focused solo builder over the horizontal incumbent; the operational twin of P7.
4. **Accumulated personal record** — switching cost via "my history lives here." Weakest alone; use only as a complement.

**Ranking rule:** count stacked moat types. One = feature. Two = viable. Three–four = build it. The ideal idea is one where **the moat is the product**, not a byproduct.

---

## 4. The Medium Screen — WhatsApp-first (current default)

For informal-India consumers, WhatsApp is the phone. Defaulting to it re-scores the axis: F1 ↑ (no app, no store, MVP = bot + webhook), F3 ↑↑ (zero install), F5 ↑ (user-initiated 24h service windows are free; utility templates ~₹0.15).

**Hard constraints, design around them:**
- Official API bots **cannot join groups** → use the **hub-and-spoke pattern**: 1:1 spokes with the bot; the user's existing group is the broadcast surface for bot-generated shareable artifacts (cards/links). This is also more principle-aligned: the bot never observes the group (P3, P6).
- Only **task-specific agents** are permitted (Meta policy, Jan 2026). Define the bot's single job.
- Never build on unofficial libraries (ban queue). Honor F8: WhatsApp is interface, never system of record.

---

## 5. The Pipeline — order of operations

1. **Hunt** in the intersection: recurring events/relationships/cycles in informal India where money, trust, or obligation flows unrecorded, inside an F7 wallet.
2. **Principle check** (vertical): ≥3 principles structurally load-bearing? If reframing is needed to force fit — that's the signal to drop it.
3. **Filter screen** (horizontal): all eight pass, honestly scored. Any single ✗ kills; fix the idea or drop it. Watch for hidden violations (a manufactured coordinator role = F3 fail; "propose and recruit peers" was one).
4. **Moat rank**: stack count decides between survivors.
5. **Medium fit**: express the MVP as hub-and-spoke WhatsApp interaction. If it can't be, justify the heavier medium against F1/F3.
6. **Reality pass**: regulation (search current-year rules — the 2024 Coaching Guidelines' >50-student threshold materially changed one candidate's score), incumbents' *failure modes* (a hated mechanism with proven spend > an empty market), IP/gray zones, and ground access (does the builder have a way into ward/school #1?).
7. **Stage-gate the build**: M0–4 seed (density + invite rate >1, revenue ₹0 by design) → M5–8 geometry gate (5–10% conversion, >60% wk-8 payer retention — **kill/pivot here, not month 20**) → M9–12 replicate (₹1.5–2L MRR). $1M ARR is a month-24–30 outcome built on the moat.

---

## 6. Calibration Cases (evidence the toolset works)

**Passed — produced by the toolset:**
- **School Exam Archive** — atom: institutional exam cycle (P1); students already photograph papers (P3); density per school (P7, moat 3); corpus deepens one cycle at a time (moat 1); intergenerational contribute-then-consume loop (F4); education wallet (F7). Stacks all four moats; the moat *is* the product. Flagged risks: paper IP gray zone, seasonality, quality control.
- **Tuition Demand Cell (Batch)** — group-shaped recurring relationship; validated by spend data (tuition = 43–47% of secondary-level household education spend), regulatory tailwind (<50-student exemption; under-16 push toward small batches), and incumbent failure (pay-per-lead resentment with proven tutor spend). Moats: computed tutor trust graph (2) + time (1) + density (3).

**Correctly rejected — and why (keep as controls):**
- *Milk/press hisaab* — passes filters adequately, draws on ~1 principle; shallow asset. "Costume" case.
- *Child record vault* — moat type 4 only; a feature, not a venture.
- *Mistri reliability graph* — right principles, fails density economics for a solo builder (low event frequency, two-sided cold start).
- *College-student crash cohorts* — one-shot atom (P1 fail); evidence shows subsidy-dependent take-up (F5 fail).
- *Personal udhaar ledger* — recording is socially costly; the tool changes the relationship (F3 fail).

---

## 7. Standing constraints (the builder context all scoring assumes)

Solo/home-studio, organic-only distribution, 2–3 seed localities maximum in year one, ₹25L ARR run-rate as the honest month-12 ceiling, leading indicators (density, invite rate, corroboration volume) over trailing ones (revenue) for the first two quarters.

---

## 8. Generative Heuristics — sourcing ideas that pass
*Added v1.2, derived from the bench-research round (July 2026): one demotion (Committee — legal read), two tightened bench positions (Kaamwali — incumbent/substitution evidence; Rent — dyadic back-solve failure), two ACTIVE survivals. Each heuristic is traceable to a named kill or survival; that traceability is the bar for adding to this section.*

The filters (§2) screen ideas that exist. These heuristics shape where to *look*, so more candidates arrive pre-fit. Apply them at pipeline step 1 (Hunt), before anything is scored.

**H1 — Atom shape determines virality geometry.** Only hunt atoms where one activation structurally implicates several people: cohorts and hubs have k > 1 by construction; dyads have k < 1 by construction and no product decision fixes it. A dyad is viable only when a hub sits behind it (a worker is a hub of dyads; an isolated tenant is not). *Source: Rent's back-solve failed at ~10× feasible seed purely on atom shape.*

**H2 — Hunt embedded payers, not convenience payers.** Ask: whose money already flows through the behaviour being recorded? A payer whose own income depends on the tool working converts at embedded-class rates (Batch's tutor, ~30%); a payer avoiding mild annoyance converts at convenience-class rates (Kaamwali's household, ~10–15%) and rarely clears F5 from a solo-feasible seed. Conversion class is a property of the payer's relationship to the money, not of product quality. *Source: Batch vs. Kaamwali back-solves.*

**H3 — Informality has two species; only one is huntable.** Legal-but-unrecorded behaviour (exam sharing, tuition batches, rent payment) is the fertile species. Illegal-as-practiced behaviour (unregistered chits) is untouchable regardless of filter scores — "we're just the record" is never assumed to survive the first scam headline. **Rule change: whenever the observed behaviour involves pooled money, the legal read moves from pipeline step 6 to step 1.** *Source: Committee's demotion.*

**H4 — Byproduct adjacency check.** A moat that any adjacent infrastructure emits as exhaust is not a moat. Ask: does a security system, ERP, payment rail, or platform already produce this record as a side effect of doing something else? *Source: NoBrokerHood's gate infrastructure emits maid attendance as a byproduct of security — in precisely the high-WTP localities. Counter-case: no system emits the internal exam-paper corpus; it exists only if deliberately collected.*

**H5 — Capital-substitution check on the atom itself.** Not "is there a competing app" but "is venture capital replacing the *relationship* the idea is built on." A tool for a dissolving atom inherits the dissolution. Prefer atoms funded startups structurally cannot substitute — institutional cycles (school year, exam calendar, seasons) over service relationships that on-demand supply can replace. *Source: Snabbit/Pronto/Urban Company's on-demand model attacking the monthly-maid relationship, not the maid-tracking tool.*

**H6 — Regulation is a sourcing query, not a risk line-item.** Actively search recent rules that push demand toward small, informal, or verifiable formats — regulation was decisive three times in one round, in three different directions (tailwind for Batch via the <50-student exemption; demand tailwind for Rent via ITR verification tightening; fatal for Committee). Hunting the regulatory delta is a generation strategy. *Source: all three bench verdicts.*

### 8.1 The composed template

Ideas that pass tend to match: **a legal-but-unrecorded behaviour (H3), inside a non-negotiable wallet (F7), anchored to an institutional cycle that outlasts both people and startups (H5, P1), with a cohort- or hub-shaped atom (H1), an embedded payer (H2), and a record no adjacent infrastructure emits as exhaust (H4).** Both ACTIVE ideas are education-wallet instances of this template. Unexplored template wallets: health (clinic-visit and chronic-care cycles), marriage (wedding-season vendor side, vendor as embedded hub), religious/community institutions (festival and society calendars — H3 applied hard wherever money pools).

### 8.2 Maintenance rule for this section

A heuristic enters §8 only with a named calibration event behind it (a kill, a demotion, a back-solve result, a survival under attack). Heuristics without a source case are opinions and belong in a scratchpad, not the toolset.

---
*v1.2 — §8 added from the bench-research round. Addenda v1.1 (load-bearing rubric, F5 pre-registration, F8 staging) and v1.1.1 (corrected §2 arithmetic, sub-test B anti-gaming clause, locality key in the minimal log) remain in force. Update the medium screen (§4) and reality-pass inputs (§5.6) as platforms and regulation move; the axes themselves should change rarely, and only with a calibration case as evidence.*
