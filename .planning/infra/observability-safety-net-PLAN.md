---
plan: infra-observability-safety-net
type: execute
autonomous: false
scope: cross-cutting (api-server runtime hardening — not a roadmap phase)
depends_on: [] # independent of Phase 6/7 work; touches shared server + webhook files
requirements: [runtime-error-capture, webhook-security, resilience]

# Adopt the runtime-safety infrastructure Smaran is missing, modelled on the
# StreetHawk/MiniBag KB practices. Smaran is WhatsApp-only (no web UI), so the
# relevant surface is the Express api-server + its fire-and-forget webhook IIFEs
# + external API calls. Frontend error boundaries / IndexedDB outbox from those
# KBs do NOT apply and are deliberately excluded.

reference_playbook:
  - /Users/maulik/streethawk/knowledgebase/01-Architecture/sh-error-handling.md
  - /Users/maulik/streethawk/minibag/knowledgebase/01-Architecture/mb-error-handling.md
  - /Users/maulik/streethawk/minibag/knowledgebase/02-Backend-SDK/mb-idempotency-resilience.md
  - /Users/maulik/streethawk/minibag/knowledgebase/02-Backend-SDK/mb-validation-layer.md
  - /Users/maulik/streethawk/minibag/knowledgebase/04-Features/mb-security-system.md

must_haves:
  truths:
    - "Unhandled promise rejections and uncaught exceptions are captured (logged + reported), never silent"
    - "Every webhook fire-and-forget IIFE reports failures to the error sink, not only pino"
    - "Inbound WhatsApp webhooks are rejected unless the Meta X-Hub-Signature-256 HMAC verifies"
    - "Duplicate webhook redelivery is deduped durably across restarts/instances, not only in-memory"
    - "A readiness endpoint fails (503) when the database is unreachable"
    - "Transient failures on idempotent external reads are retried with backoff, not hard-failed"
  artifacts:
    - path: code/artifacts/api-server/src/lib/sentry.ts
      provides: "initSentry(), captureException() — DSN-gated backend error sink"
    - path: code/artifacts/api-server/src/lib/retry.ts
      provides: "withRetry()/retryFetch() + isRetryableError()"
    - path: code/lib/db/src/schema/processed-webhooks.ts
      provides: "durable webhook message-id dedup table"
---

<objective>
Give Smaran a production safety net for runtime errors and webhook abuse, reusing the
StreetHawk/MiniBag KB patterns adapted to a WhatsApp-only Express backend. Ordered in tranches by
severity: P0 error capture + the live webhook-signature security hole, then P1 durable idempotency
+ readiness, then P2 external-call resilience. Each task cites the reference doc it derives from.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
@code/.agents/memory/smaran-product.md
</context>

<current_state_audit>
Verified 2026-07-16 against code (ground truth):

ALREADY PRESENT (do not rebuild):
- pino structured logger with redaction — `code/artifacts/api-server/src/lib/logger.ts`.
- Liveness `/api/healthz` (returns {status:ok}, NO db check) — `src/routes/health.ts`.
- `/api/keepalive` — warms DB, ALWAYS 200, built for external pingers (point UptimeRobot HERE, not healthz) — `src/routes/keepalive.ts`.
- Webhook message-id dedup, but IN-MEMORY Set + ring buffer only — `src/routes/whatsapp.ts:24-25,104-114`.
- Webhook fire-and-forget IIFEs already carry internal try/catch → `req.log.error` (9 sites, e.g. whatsapp.ts:426,487,538,565,604,856,921,982). Good — but errors sink only to pino.

MISSING / WEAK:
- No error aggregator (no @sentry/*). No global process handlers in `src/index.ts`.
- No Express error-handling middleware in `src/app.ts` (order today: cors() [wide open] → express.json() → urlencoded → "/api" router).
- No Meta webhook signature verification anywhere (grep for X-Hub-Signature/hmac/APP_SECRET = empty). **Live security hole.**
- `/healthz` does not check the DB → Render `healthCheckPath: /api/healthz` cannot detect DB-down.
- 10 lib files call raw `fetch()` to external APIs with no retry (geocoding, brain [Vedika panchang], media, whatsapp-client [Meta], asr/sarvam, asr/openai, extraction-models/{gemini,claude,sarvam-m}).
- `app.use(cors())` allows all origins; no rate limiting; no helmet.
</current_state_audit>

<tasks>

<!-- ===================== TRANCHE 1 — P0: runtime error capture ===================== -->

<task type="auto">
  <name>Task 1: Backend Sentry sink (DSN-gated) + Express error handler</name>
  <files>code/artifacts/api-server/src/lib/sentry.ts, code/artifacts/api-server/src/index.ts, code/artifacts/api-server/src/app.ts, code/artifacts/api-server/package.json</files>
  <ref>mb-error-handling.md §Sentry Integration (backend). Mirror: initSentry() at the very top of the entry file BEFORE other imports; DSN-gated no-op; beforeSend drops dev events + tags app; setupSentryErrorHandler(app).</ref>
  <action>
    1. Add `@sentry/node` (+ `@sentry/profiling-node`) to api-server deps.
    2. Create `src/lib/sentry.ts`: `initSentry()` (no-op unless `process.env.SENTRY_DSN`; nodeProfilingIntegration; tracesSampleRate/profilesSampleRate 0.1 prod / 1.0 else; beforeSend drops events in NODE_ENV!=production and tags `app: 'smaran-api'`), and `captureException(err, context?)` (always also logs via pino `logger.error`; guarded by SENTRY_DSN).
    3. Call `initSentry()` at the TOP of `src/index.ts`, before `import app`. (May require moving app import below, or a separate `instrument.ts` imported first.)
    4. Add a terminal Express error-handling middleware in `src/app.ts` AFTER the "/api" router: Sentry expressErrorHandler (or manual capture) → respond 500 JSON `{ error: "internal" }`. Keep it last.
  </action>
  <acceptance_criteria>
    - initSentry no-ops cleanly with no DSN (logs a one-line notice); reports when SENTRY_DSN is set.
    - Error thrown in a route reaches the error middleware and is captured.
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Backend error sink wired, DSN-gated.</done>
</task>

<task type="auto">
  <name>Task 2: Global process handlers (unhandledRejection / uncaughtException)</name>
  <files>code/artifacts/api-server/src/index.ts</files>
  <ref>sh-error-handling.md §Global Error Handler (the "Remaining Gap" they flag); mb §Sentry global handlers.</ref>
  <action>
    Register `process.on("unhandledRejection", ...)` and `process.on("uncaughtException", ...)`:
    log via pino + `captureException`. For uncaughtException, capture then exit(1) after a short
    flush delay (let the process restarter/Render replace the instance) — do NOT swallow and
    continue in an unknown state. These are the backstop for any webhook IIFE that lacks a catch.
  </action>
  <acceptance_criteria>
    - A deliberately unhandled rejection is logged + captured (verify by temporary local probe, then remove).
    - uncaughtException path captures then exits non-zero.
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>No unhandled async error is silent.</done>
</task>

<task type="auto">
  <name>Task 3: Route the 9 webhook IIFE catch blocks + pipeline/cron through captureException</name>
  <files>code/artifacts/api-server/src/routes/whatsapp.ts, code/artifacts/api-server/src/lib/ingest.ts, code/artifacts/api-server/src/lib/brain.ts, code/artifacts/api-server/src/routes/cron.ts</files>
  <ref>mb §Render-crash reporting — boundaries forward to captureException with context.</ref>
  <action>
    In each existing `catch (err) { req.log.error(...) }` inside a fire-and-forget IIFE (whatsapp.ts
    ~426,487,538,565,604,856,921,982) and in the ingest pipeline + cron catch blocks, ALSO call
    `captureException(err, { context })` with the jobId/purohitId/eventId already in scope. Keep the
    pino log. Do not change control flow. Audit that EVERY `(async () => {...})()` has an internal
    catch — add one where missing.
  </action>
  <acceptance_criteria>
    - Every webhook IIFE has an internal catch that both logs and captures.
    - grep shows no `(async () => {` in whatsapp.ts without a matching try/catch.
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Background webhook failures are visible in the error sink.</done>
</task>

<!-- ===================== P0 SECURITY: webhook signature ===================== -->

<task type="checkpoint">
  <name>Task 4: Verify Meta webhook signature (X-Hub-Signature-256) — SECURITY</name>
  <files>code/artifacts/api-server/src/app.ts, code/artifacts/api-server/src/routes/whatsapp.ts</files>
  <ref>mb-security-system.md §input validation / auth boundary. Meta docs: HMAC-SHA256 of the RAW request body keyed by the App Secret, hex, sent as `X-Hub-Signature-256: sha256=...`.</ref>
  <action>
    1. Capture the raw body ONLY for the webhook route (express.json's `verify` callback storing
       `req.rawBody`, or a route-scoped `express.raw()`), since `express.json()` today discards it.
    2. On POST /whatsapp/webhook: compute `sha256=HMAC(APP_SECRET, rawBody)` and timing-safe compare
       against the header. Reject with 401 (and captureMessage) on mismatch or missing header.
    3. Add `WHATSAPP_APP_SECRET` to `.env.example` + document in KB. Do NOT hardcode.
    Checkpoint: requires the Meta App Secret provisioned; confirm value source with operator.
    Product note: WhatsApp-only, no payment webhooks — see code/.agents/memory/smaran-product.md.
  </action>
  <acceptance_criteria>
    - A POST with a bad/missing signature is rejected 401 and does NOT reach any handler.
    - A correctly-signed POST passes (E2E harness must sign its payloads, or gate verification behind an env flag in test).
    - Typecheck passes.
  </acceptance_criteria>
  <verify><manual>Operator confirms APP_SECRET provisioned; signed request passes, unsigned rejected.</manual></verify>
  <done>Webhook can no longer be spoofed by anyone who knows the URL.</done>
</task>

<!-- ===================== TRANCHE 2 — P1: durable idempotency + readiness ===================== -->

<task type="auto">
  <name>Task 5: Durable webhook message-id dedup</name>
  <files>code/lib/db/src/schema/processed-webhooks.ts, code/lib/db/src/schema/index.ts, code/artifacts/api-server/src/routes/whatsapp.ts</files>
  <ref>mb-idempotency-resilience.md §Backend Request Idempotency — reserve-before-execute; here a simpler read-dedup: INSERT message_id, on unique conflict → skip.</ref>
  <action>
    1. Add `processed_webhooks` table: `message_id` (text, PRIMARY KEY), `received_at` (timestamptz default now). Export from schema/index.ts; push to smaran-dev (drizzle-kit push).
    2. Replace the in-memory Set check (whatsapp.ts:104-114) with an atomic INSERT ... ON CONFLICT
       DO NOTHING; if 0 rows inserted → duplicate → skip. Keep the in-memory Set as an optional
       fast-path in front of the DB if desired, but the DB is the source of truth.
    3. Add a nightly cleanup (reuse an existing cron or the subscription-sweep) deleting rows older
       than 48h — mirrors mb §Nightly Idempotency Key Cleanup.
  </action>
  <acceptance_criteria>
    - Redelivering the same message_id after a simulated restart (fresh process) is deduped via the DB.
    - Table exists in smaran-dev and is exported.
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Dedup survives restarts and multiple instances.</done>
</task>

<task type="auto">
  <name>Task 6: Readiness endpoint with DB check</name>
  <files>code/artifacts/api-server/src/routes/health.ts, render.yaml</files>
  <ref>mb-error-handling.md §Monitoring & Health Checks — /health/ready checks DB, 503 on fail; Render healthCheckPath gates deploys.</ref>
  <action>
    1. Add `GET /health/ready`: `SELECT 1` via the pool (dynamic import, env-gated like keepalive.ts).
       200 `{ server:"ok", database:"ok" }` when reachable, 503 `{ database:"down" }` otherwise.
    2. Keep `/healthz` as pure liveness. Point Render `healthCheckPath` at `/api/health/ready` so a
       DB-unreachable deploy is caught (confirm with operator — a flaky DB will then block deploys).
    3. Leave `/keepalive` as the external-pinger/UptimeRobot target (always-200 by design).
  </action>
  <acceptance_criteria>
    - /health/ready returns 503 when DATABASE_URL is unset/unreachable, 200 when reachable.
    - render.yaml healthCheckPath updated (operator-confirmed).
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Platform can detect DB-down.</done>
</task>

<!-- ===================== TRANCHE 3 — P2: external-call resilience ===================== -->

<task type="auto">
  <name>Task 7: Shared retry-with-backoff for idempotent external reads</name>
  <files>code/artifacts/api-server/src/lib/retry.ts, code/artifacts/api-server/src/lib/brain.ts, code/artifacts/api-server/src/lib/geocoding.ts, code/artifacts/api-server/src/lib/asr/sarvam.ts, code/artifacts/api-server/src/lib/asr/openai.ts</files>
  <ref>mb-error-handling.md §Retry Utility — retryWithBackoff (exp backoff + ±25% jitter), isRetryableError (408/429/5xx + network codes), retryFetch. Reads only; mutations use idempotency not blind retry.</ref>
  <action>
    1. Create `src/lib/retry.ts`: `isRetryableError`, `withRetry(fn, {maxAttempts,baseDelay,maxDelay,shouldRetry,onRetry})`, `retryFetch(url,options)`.
    2. Wrap the IDEMPOTENT read-side fetches: Vedika panchang (brain.ts fetchPanchangForDate),
       Nominatim geocoding, ASR transcription calls. Log each retry via onRetry.
    3. Do NOT blind-retry Meta send calls (whatsapp-client) — a send lacks an idempotency key and
       could double-send. If retry is wanted there, gate behind a message dedup first (out of scope
       here; note it).
  </action>
  <acceptance_criteria>
    - Transient 5xx/timeout on a wrapped read retries then succeeds/fails cleanly.
    - Meta send path is NOT blind-retried.
    - Typecheck passes.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Transient external blips no longer hard-fail user flows.</done>
</task>

<task type="auto">
  <name>Task 8 (optional hardening): CORS tighten + webhook rate-limit + helmet</name>
  <files>code/artifacts/api-server/src/app.ts, code/artifacts/api-server/package.json</files>
  <ref>mb-security-system.md §General Rate Limiting (express-rate-limit), §CORS/CSP.</ref>
  <action>
    1. Replace open `cors()` with an allowlist (Smaran has no browser origin needs beyond ops tools —
       restrict or remove). 2. Add `express-rate-limit` on the webhook + ops routes. 3. Add `helmet`.
    Keep changes minimal; this is defense-in-depth, lower priority than Tasks 1–6.
  </action>
  <acceptance_criteria>
    - CORS no longer allows arbitrary origins; webhook has a rate limit; helmet headers present.
    - Typecheck passes; existing E2E still green.
  </acceptance_criteria>
  <verify><automated>pnpm --dir code --filter @workspace/api-server run typecheck</automated></verify>
  <done>Baseline HTTP hardening in place.</done>
</task>

<!-- ===================== DOCS ===================== -->

<task type="auto">
  <name>Task 9: KB doc + logbook</name>
  <files>knowledgebase/01-Architecture/smaran-error-handling.md, knowledgebase/05-Logbook/</files>
  <action>
    Write `01-Architecture/smaran-error-handling.md` mirroring the streethawk/minibag error-handling
    docs' shape (error sink, global handlers, health/readiness, retry, webhook signature + dedup,
    env vars table). Add a dated Logbook entry. Bump _last_updated. Run `npm run kb:freshness`.
  </action>
  <acceptance_criteria>
    - Doc lists every new env var (SENTRY_DSN, WHATSAPP_APP_SECRET) + endpoint + table.
    - Logbook entry created.
  </acceptance_criteria>
  <verify><automated>npm run kb:freshness</automated></verify>
  <done>Practice captured in Smaran's KB.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|-----------|
| T-INF-01 | Spoofing | WhatsApp webhook | mitigate | X-Hub-Signature-256 HMAC verify (Task 4) — currently UNMITIGATED |
| T-INF-02 | Repudiation | background IIFE failures | mitigate | captureException + global handlers (Tasks 1-3) |
| T-INF-03 | Tampering | duplicate webhook redelivery | mitigate | durable processed_webhooks dedup (Task 5) |
| T-INF-04 | DoS | unauthenticated webhook flood | mitigate | signature verify + rate limit (Tasks 4,8) |
| T-INF-05 | Info disclosure | error responses / logs | mitigate | generic 500 body; pino redaction already on; Sentry beforeSend drops dev |
</threat_model>

<operator_checkpoints>
- SENTRY_DSN provisioned in Render env (api-server + the 3 cron jobs) — until then Sentry no-ops.
- WHATSAPP_APP_SECRET provisioned (Meta App dashboard → App Secret) for Task 4.
- Render healthCheckPath switch to /api/health/ready (Task 6) — confirm DB stability first.
- Point UptimeRobot at /api/keepalive (external dashboard, not repo).
</operator_checkpoints>

<verification>
- Typecheck green across the code workspace after each tranche.
- Existing E2E (brain, schedule, ledger, whatsapp) still green — the signature-verify task (4) MUST
  update the test harness to sign payloads or gate verification behind a test env flag, else all
  webhook E2E will 401.
- A signed webhook passes; an unsigned/badly-signed webhook is rejected 401.
- Operator checkpoints confirmed.
</verification>

<success_criteria>
- Runtime errors (sync, async, unhandled) are captured and alertable, not silent.
- The WhatsApp webhook rejects unsigned requests and dedupes redelivery durably.
- The platform reports DB-down via readiness; idempotent external reads survive transient blips.
</success_criteria>

<output>
After completion, create `.planning/infra/observability-safety-net-SUMMARY.md`.
</output>
</content>
