# Phase 4: Daily Brain — Scheduling & Lapse Recovery - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

The Daily Brain handles proactive user notifications and lapsed user re-engagement. It runs as a daily background task at 6:00 AM, scanning the events database and resolving Hindu dates to upcoming calendar dates.

- **Upcoming Ritual Notifications (BRAIN-01):** The job resolves the coming week's dates against each purohit's registered `events` table (respecting their calendar system choice: amanta vs purnimanta). It schedules pre-ritual alerts ~7 days and ~2 days ahead. Pre-ritual cards contain tithi/date, ritual name, samagri (material) checklist, and a "Confirm ritual" tap. These cards do NOT include any payment links.
- **Lapse Recovery (BRAIN-02):** The scanner detects yajman families whose expected annual rituals (determined from `last_performed_year` and the target Hindu month) have no future booking scheduled for the current cycle. It sends a re-engagement nudge to the purohit.
- **Tone/Style Registers (BRAIN-03):** The notification engine utilizes distinct copy templates depending on the event type: solemn events (e.g. shraddh/anniversary death ceremonies) use a highly respectful, formal copy register, while celebratory events (e.g. birthdays, kathas) use a celebratory register.

</domain>

<decisions>
## Implementation Decisions

### Cron Gating
- **D-01:** The daily cron runs as an unauthenticated HTTP endpoint `/api/cron/daily-brain` secured via header verification of the `CRON_SECRET` variable, matching the retention purge endpoint design.

### Calendar Translation
- **D-02:** Date matching queries the database for events matching the day's resolved `maas`, `paksha`, and `tithi`. The month names differ between Purnimanta and Amanta systems during the dark fortnight (Krishna Paksha). The matching engine in `brain.ts` translates month names dynamically based on the purohit's configured `calendar_system`.

### Alert Throttling
- **D-03:** Alert dispatches iterate over all active purohits. To prevent hitting Meta Cloud API rate limits, message dispatch is executed in batched chunks of 20 with concurrent throttled execution.

</decisions>

<canonical_refs>
## Canonical References

- `docs/smaran-blueprint-v3.md` Part 5, State 3 (Collect: daily scheduling & recovery)
- `docs/smaran-blueprint-v3.md` Part 6 (Database Schema: `events.last_performed_year` and `purohits.calendar_system`)
- `.planning/ROADMAP.md` Phase 4 details and success criteria
- `.planning/REQUIREMENTS.md` BRAIN-01, BRAIN-02, BRAIN-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `code/artifacts/api-server/src/lib/whatsapp-client.ts`: Send helper.
- `code/artifacts/api-server/src/lib/panchang.ts` or `/api/panchang` route: Used to resolve Gregorian dates to Hindu calendar elements (maas, paksha, tithi).
- `code/lib/db/src/schema/events.ts`: Defines event types (`shraddh`, `katha`, `birthday`, etc.) and tithi representation.

</code_context>
