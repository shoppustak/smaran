# Phase 2 Plan 9 Summary

## Accomplishments
1. **OpenAPI Specification**:
   - Added the `ingestion` tag to `code/lib/api-spec/openapi.yaml`.
   - Defined `GET /ingest-jobs/{id}` (requiring `X-Internal-Key` header) returning PII-minimal status metadata.
   - Defined `POST /ingest-jobs/purge` returning counts of purged transcripts, extractions, expired awaiting confirm rows, and deleted rows.
   - Configured `fieldScores` as a record of numbers (additionalProperties) to avoid Zod codegen `looseObject` compilation failures.
2. **Endpoint Implementation**:
   - Created `code/artifacts/api-server/src/routes/ingest-jobs.ts`.
   - `GET /ingest-jobs/:id`: Asserts authorization header matches `INTERNAL_API_KEY` before checking database. Excludes raw transcript and extraction fields per DPDP-alignment.
   - `POST /ingest-jobs/purge`: Performs 30-day retention cleanup of transcripts/extractions, and expires stale `awaiting_confirm` jobs older than 30 days to `rejected` with error `expired`.
   - Registered the router in `code/artifacts/api-server/src/routes/index.ts`.
3. **Verification**:
   - Verified that `pnpm --dir code run typecheck` passes cleanly.
