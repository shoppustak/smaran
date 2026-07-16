# Plan execution summary: 04-03-PLAN

## Changes Implemented

### 1. Build Lapse-Detection Scanner
- Implemented `runLapseDetectionScan(): Promise<void>` in [brain.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/brain.ts):
  - Queries active events where `last_performed_year` is older than the current calendar year.
  - Filters out events where a booking (pending or confirmed ledger entry) already exists in the current Gregorian calendar year.
  - Dispatches a WhatsApp re-engagement card to the associated purohit using Devanagari translation registers for month (`maas`), fortnight (`paksha`), and day (`tithi`).
  - Employs batched dispatches (chunk size of 20) with throttled concurrent queues to safeguard against rate limits.
  - Logs recovery metrics for operational tracking.
- Integrated the scan into `/api/cron/daily-brain` within [cron.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/routes/cron.ts), triggering both upcoming pre-ritual alerts and lapse recovery nudges upon cron execution.

### 2. E2E Tests for Daily Brain
- Added a full Playwright integration spec in [brain.spec.ts](file:///Users/maulik/smaran/tests/api/brain.spec.ts):
  - Validates `401 Unauthorized` gating checks when `x-cron-secret` is missing or incorrect.
  - Seeds the database with upcoming events matching the sandbox panchang payload, a lapsed event with no booking, and a lapsed event that already has a booking for the current year.
  - Calls POST `/api/cron/daily-brain` with valid headers and checks for a `200 OK` success response.
  - Asserts that the upcoming ritual alert card and lapse recovery nudge cards are sent correctly.
  - Verifies that the lapse nudge card contains the correct `lapse-engage:${eventId}` button reply action ID, and translates fields to Devanagari.
  - Asserts that lapsed events with bookings in the current year do not receive nudges.
- Extended Playwright's [playwright.config.ts](file:///Users/maulik/smaran/playwright.config.ts) to populate `CRON_SECRET` and `INTERNAL_API_KEY` in the test web server environment, facilitating automated E2E runs.
- Enhanced [whatsapp-client.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/whatsapp-client.ts) to record interactive button and list reply IDs in the captured outbound message text for seamless E2E assertions.

## Verification Run Status

The following verification commands were attempted but timed out waiting for user approval:
1. `pnpm --dir code run typecheck`
2. `DB_PASS=$(awk '/### smaran-dev/{f=1} f && /db pass/{print $NF; exit}' docs/db-creds) && DATABASE_URL="postgresql://postgres.ajzoxgjvtxhzzkgxxmxv:${DB_PASS}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres" INTERNAL_API_KEY="e2e-local-key" npx playwright test brain`

> [!NOTE]
> Please execute these commands manually in the repository workspace to run the E2E verification suite. All code has been written and structured to support this run cleanly.
