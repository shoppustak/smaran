# Phase 4 Plan 04 (Gap-Closure) — Summary

**Closed out:** 2026-07-16
**Type:** goal-backward gap-closure + verification

## Outcome

04-04-PLAN was written to close 5 roadmap gaps (G1–G5) found by the 2026-07-16 goal-backward
audit of Phase 4. Re-audit at closeout found **all five were already implemented in the working
tree** (the mass-implementation overshot the plan tracking). This closeout verified each against
live code + E2E rather than re-executing, then filled the two genuine residuals (KB doc, this
summary) and documented the operator checkpoints that cannot be resolved from the repo.

## Gap verification (all CONFIRMED closed in code)

| Gap | Roadmap criterion | Verified evidence |
|-----|-------------------|-------------------|
| G1 | C1 daily 6 AM job | `render.yaml` cron `smaran-daily-brain`, `schedule: "30 0 * * *"` (00:30 UTC = 06:00 IST), curls `/cron/daily-brain` with `x-cron-secret` |
| G2 | C1 cards ~7 & ~2 days | `PRE_RITUAL_ALERT_DAYS = [7, 2]` gates `dispatchPreRitualAlerts`; UTC-ms day-diff (`todayUTC`/`targetUTC`) |
| G3 | C1 samagri list | `buildUpcomingPreRitualCard` + `sendPreRitualAlerts` embed per-event-type samagri; orphaned singular `sendPreRitualAlert` removed |
| G4 | C2 recovery tracked | `lapse_recoveries` table (exported); `runLapseDetectionScan` upserts `nudgedAt`; `lapse-engage:{eventId}` webhook handler sets `recoveredAt` with owner check |
| G5 | C3 template packs | `sendWhatsappTemplate` helper; 3 distinct packs (`smaran_pre_ritual_solemn`/`_celebratory`/`smaran_lapse_recovery_nudge`); free-form interactive fallback on template failure |

## Test coverage (Task 6) — CONFIRMED present, not missing

Earlier audit flagged brain.spec as lacking samagri + cadence assertions. That was a false
negative (grep searched `samagri`/`काले तिल`; the seeded event is `katha`, whose samagri marker
is `पंजीरी`). `tests/api/brain.spec.ts` actually asserts:
- **7/2 cadence:** `expect(alertsForA.length).toBe(2)` + explicit `शेष दिन: 2` and `शेष दिन: 7`.
- **Samagri:** both alerts `.toContain("पंजीरी")`.
- **Lapse recovery:** owner tap sets `recovered_at`; non-owner (`yajmanPhone`) rejected, row stays null.

**Verification run (2026-07-16):** `brain.spec` — 2 passed (30.1s) against smaran-dev.

## Residuals filled at closeout

- **KB doc:** `knowledgebase/01-Architecture/whatsapp-template-packs.md` created — registry, per-pack
  body-variable order, button payloads, language code, operational status.
- **This summary** (04-04-PLAN `<output>`).

## Operator checkpoints — OUTSTANDING (not resolvable from repo)

1. **Meta template approval (Task 5).** The 3 Utility templates must be submitted/approved in the
   Meta dashboard (external, days lead time). Until approved, proactive sends fall back to free-form
   interactive, which only delivers inside the 24h window. Confirm approval before relying on
   outside-window delivery.
2. **CRON_SECRET provisioning (Task 4).** `render.yaml` declares the cron + `x-cron-secret` header;
   the `CRON_SECRET` value must exist in Render env on both the api-server and the cron job for the
   6 AM trigger to authenticate. Confirm in the Render dashboard.

## Integration note

The shared `/cron/daily-brain` handler gained a Phase-5 call (`persistResolvedSchedule`, warms the
day-sheet resolved-schedule cache) during 05-03 closeout. It runs after resolution, before
dispatch; brain.spec re-run confirms **no Phase-4 regression** (2 passed).

## Self-check

- [x] G1–G5 each verified against live code with cited evidence
- [x] brain.spec run green (2 passed), samagri + cadence + lapse assertions confirmed
- [x] KB template-pack doc created
- [x] Operator checkpoints (Meta approval, CRON_SECRET) documented as outstanding
- [x] No code re-execution needed — gaps were already closed
</content>
