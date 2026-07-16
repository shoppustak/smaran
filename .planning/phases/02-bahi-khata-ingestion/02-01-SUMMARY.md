# Phase 2: Bahi-Khata Ingestion
## Plan 01: Define ingest_jobs table & events/yajmans provenance columns

### Execution Summary
- Created [ingest-jobs.ts](file:///Users/maulik/smaran/code/lib/db/src/schema/ingest-jobs.ts) schema defining `ingest_jobs` table.
- Added `label`, `source`, and `ingestJobId` provenance columns to [events.ts](file:///Users/maulik/smaran/code/lib/db/src/schema/events.ts).
- Added `source` column to [yajmans.ts](file:///Users/maulik/smaran/code/lib/db/src/schema/yajmans.ts).
- Re-exported the new schema in [index.ts](file:///Users/maulik/smaran/code/lib/db/src/schema/index.ts).
- **Note**: Terminal commands `typecheck:libs` and `push-force` to deploy to `smaran-dev` timed out waiting for user approval.

### Status
- **Tasks Complete:** 1/2 (Schema definition complete, DB push pending approval)
- **Completed On:** 2026-07-15
