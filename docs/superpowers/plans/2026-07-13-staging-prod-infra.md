# Staging & Production Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a $0/month production deployment for `code/artifacts/api-server` on Render + Supabase, using minibag's proven always-warm-via-external-pinger pattern, with `api.smaran.click` as the production URL. No persistent staging host — local dev covers that, for the same free-tier budget reason minibag itself avoided a second Render service.

**Architecture:** A new `GET /api/keepalive` route (ported from minibag's, always-200 regardless of DB state) gets pinged every 5 minutes by an external free service (cron-job.org), keeping the single Render free web service perpetually warm. A `render.yaml` at the repo root defines that service. Everything else in this plan is manual external account setup this document specifies precisely but cannot execute.

**Tech Stack:** Express (existing `api-server`), Render (free Web Service), Supabase (free Postgres), cron-job.org (free external pinger), orval (existing OpenAPI→zod/React-Query codegen pipeline).

## Global Constraints

- **Prerequisite**: Tasks 5 and 8 in this plan depend on files created by `docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md` (the root `tests/api/` Playwright suite and `knowledgebase/` respectively). If that plan hasn't been executed yet, those two tasks will fail their prerequisite check (Step 1 of each) — stop and run that plan first, or skip those two tasks and come back to them later.
- `@workspace/db` (`code/lib/db/src/index.ts:8-10`) throws at **import time** if `DATABASE_URL` is unset. `DATABASE_URL` is not set anywhere in this repo as of this writing (confirmed: no `.env` file exists, nothing currently imports `@workspace/db`). The keepalive route MUST use a dynamic `import()` gated behind `process.env.DATABASE_URL`, never a static top-level import — a static import would crash the entire server on every boot until Phase 1 wires up a real database. This was verified live during this plan's authoring (see Task 2).
- `lib/api-zod`'s schemas are generated from `lib/api-spec/openapi.yaml` via `orval` (`pnpm --filter @workspace/api-spec run codegen`) — never hand-edit files under `lib/api-zod/src/generated/` or `lib/api-client-react/src/generated/`; edit `openapi.yaml` and regenerate.
- Tasks 6-7 (Render account, Supabase projects, cron-job.org, DNS) are **manual, human-only steps** — no agent can create third-party accounts or edit DNS at a registrar. They are written as precise checklists with exact values, not as commands to run.
- `smaran.click` is an already-owned domain — the production API subdomain is `api.smaran.click`, not a Render-provided `*.onrender.com` URL (though the latter still works as a fallback during setup, before DNS propagates).

---

### Task 1: `.env.example`

**Files:**
- Create: `code/artifacts/api-server/.env.example`

- [ ] **Step 1: Write the file**

`code/artifacts/api-server/.env.example`:
```bash
# Required — server throws on boot if unset (see src/index.ts)
PORT=3000

# Optional — Vedika Panchang API. Unset = sandbox (fixed mock payload, no key needed).
# Set both to switch to production.
VEDIKA_API_KEY=
VEDIKA_API_BASE_URL=

# Optional — Meta WhatsApp Cloud API. Unset = /whatsapp/send returns 502 "not configured".
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
# Shared secret for the GET /whatsapp/webhook verify handshake — any string you choose,
# must match what's entered in the Meta App Dashboard's webhook config.
WHATSAPP_VERIFY_TOKEN=

# Optional — Postgres (Drizzle ORM, code/lib/db). Unset = GET /keepalive reports
# database: "not_configured" and no query is attempted. Once set, @workspace/db's
# module-level code runs on first import — see Global Constraints above.
DATABASE_URL=
```

- [ ] **Step 2: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/api-server/.env.example
git commit -m "docs(api-server): add .env.example documenting required/optional env vars"
```

---

### Task 2: OpenAPI spec + codegen for `KeepaliveResponse`

**Files:**
- Modify: `code/lib/api-spec/openapi.yaml`

**Interfaces:**
- Produces: `KeepaliveResponse` zod schema (generated into `code/lib/api-zod/src/generated/api.ts`), consumed by Task 3.

- [ ] **Step 1: Add the `/keepalive` path and `KeepaliveStatus` schema**

In `code/lib/api-spec/openapi.yaml`, insert a new path directly after the existing `/healthz` path (before the `components:` line):
```yaml
  /keepalive:
    get:
      operationId: keepalive
      tags: [health]
      summary: Keep-warm endpoint for external uptime pingers
      description: >
        Always returns 200, even when the database is unreachable or not configured —
        external pingers (e.g. cron-job.org) treat non-2xx as failure and auto-disable
        the job after repeated failures. Use /healthz for a strict health check instead.
      responses:
        "200":
          description: Always returned, regardless of database state
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/KeepaliveStatus"
```

Then add a new schema under `components: schemas:`, directly after the existing `HealthStatus` schema:
```yaml
    KeepaliveStatus:
      type: object
      properties:
        status:
          type: string
        database:
          type: string
          enum: [ok, cold, not_configured]
        timestamp:
          type: string
      required:
        - status
        - database
        - timestamp
```

- [ ] **Step 2: Run codegen**

```bash
cd /Users/maulik/smaran
pnpm --dir code --filter @workspace/api-spec run codegen
```
Expected output ends with:
```
$ orval --config ./orval.config.ts && pnpm -w run typecheck:libs
🍻 orval v8.20.0 - A swagger client generator for typescript
...
$ tsc --build
```
(no errors from either command)

- [ ] **Step 3: Verify `KeepaliveResponse` was generated**

```bash
cd /Users/maulik/smaran
grep -n "KeepaliveResponse" code/lib/api-zod/src/generated/api.ts
```
Expected: prints a line starting `export const KeepaliveResponse = zod.object({`.

- [ ] **Step 4: Commit**

```bash
cd /Users/maulik/smaran
git add code/lib/api-spec/openapi.yaml code/lib/api-zod/ code/lib/api-client-react/
git commit -m "feat(api-spec): add /keepalive endpoint + KeepaliveStatus schema"
```

---

### Task 3: `/api/keepalive` route

**Files:**
- Create: `code/artifacts/api-server/src/routes/keepalive.ts`
- Modify: `code/artifacts/api-server/src/routes/index.ts`

**Interfaces:**
- Consumes: `KeepaliveResponse` from `@workspace/api-zod` (Task 2).
- Produces: `GET /api/keepalive` — always HTTP 200, body `{status: "ok", database: "ok"|"cold"|"not_configured", timestamp: string}`.

- [ ] **Step 1: Write the route**

`code/artifacts/api-server/src/routes/keepalive.ts`:
```ts
import { Router, type IRouter } from "express";
import { KeepaliveResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Keep-warm endpoint for external uptime pingers (e.g. cron-job.org) on Render +
// Supabase free tiers: Render spins the service down after ~15 min with no inbound
// traffic; Supabase pauses the free-tier database after ~1 week of no activity.
//
// This ALWAYS returns 200, even when the DB is unreachable or not configured yet.
// /healthz returns a strict check and is NOT safe to point a pinger at: external
// pingers count non-2xx as failure and auto-disable the job after repeated
// failures. Point the pinger at THIS endpoint instead.
//
// @workspace/db throws at import time if DATABASE_URL is unset (see
// lib/db/src/index.ts) — so the import is dynamic and gated behind an env check,
// not static, otherwise requiring this file at all would crash the server before
// Phase 1 wires up a real database.
router.get("/keepalive", async (req, res) => {
  let database: "ok" | "cold" | "not_configured" = "not_configured";

  if (process.env.DATABASE_URL) {
    try {
      const { pool } = await import("@workspace/db");
      await pool.query("SELECT 1");
      database = "ok";
    } catch (err) {
      req.log.warn({ err }, "Keepalive DB warm query failed (still returning 200)");
      database = "cold";
    }
  }

  const data = KeepaliveResponse.parse({
    status: "ok",
    database,
    timestamp: new Date().toISOString(),
  });
  res.status(200).json(data);
});

export default router;
```

- [ ] **Step 2: Register the route**

In `code/artifacts/api-server/src/routes/index.ts`, change:
```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import panchangRouter from "./panchang";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(panchangRouter);
router.use(whatsappRouter);
```
to:
```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keepaliveRouter from "./keepalive";
import panchangRouter from "./panchang";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keepaliveRouter);
router.use(panchangRouter);
router.use(whatsappRouter);
```

- [ ] **Step 3: Build**

```bash
cd /Users/maulik/smaran
pnpm --dir code --filter @workspace/api-server run build
```
Expected: succeeds, no type errors.

- [ ] **Step 4: Verify with no `DATABASE_URL` set (today's real state)**

```bash
cd /Users/maulik/smaran
PORT=4301 node code/artifacts/api-server/dist/index.mjs > /tmp/api-keepalive-verify.log 2>&1 &
echo $! > /tmp/api-kv.pid
sleep 1.5
curl -s http://localhost:4301/api/keepalive -w "\nSTATUS:%{http_code}\n"
kill "$(cat /tmp/api-kv.pid)" 2>/dev/null
rm -f /tmp/api-kv.pid
```
Expected: `{"status":"ok","database":"not_configured","timestamp":"..."}` followed by `STATUS:200`. The server must NOT crash on boot (this is the regression this task's Global Constraint warns about).

- [ ] **Step 5: Verify with an unreachable `DATABASE_URL` (the "cold" path)**

```bash
cd /Users/maulik/smaran
PORT=4302 DATABASE_URL="postgres://user:pass@localhost:1/nonexistent" node code/artifacts/api-server/dist/index.mjs > /tmp/api-keepalive-verify2.log 2>&1 &
echo $! > /tmp/api-kv2.pid
sleep 1.5
curl -s http://localhost:4302/api/keepalive -w "\nSTATUS:%{http_code}\n" --max-time 10
kill "$(cat /tmp/api-kv2.pid)" 2>/dev/null
rm -f /tmp/api-kv2.pid
```
Expected: `{"status":"ok","database":"cold","timestamp":"..."}` followed by `STATUS:200` — never a non-200, even though the DB is unreachable. This is the load-bearing behavior for the external pinger (Task 6) to never auto-disable.

- [ ] **Step 6: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/api-server/src/routes/keepalive.ts code/artifacts/api-server/src/routes/index.ts
git commit -m "feat(api-server): add always-200 /api/keepalive endpoint for external pingers"
```

---

### Task 4: `render.yaml`

**Files:**
- Create: `render.yaml` (repo root, `/Users/maulik/smaran/render.yaml`)

- [ ] **Step 1: Write the file**

`render.yaml`, modeled on minibag's working config (`/Users/maulik/streethawk/minibag/render.yaml`), adapted to Smaran's pnpm workspace and single service:
```yaml
services:
  - type: web
    name: smaran-api
    env: node
    region: singapore
    plan: free
    branch: main
    autoDeploy: true
    buildCommand: cd code && pnpm install && pnpm --filter @workspace/api-server run build
    startCommand: node code/artifacts/api-server/dist/index.mjs
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DATABASE_URL
        sync: false
      - key: WHATSAPP_ACCESS_TOKEN
        sync: false
      - key: WHATSAPP_PHONE_NUMBER_ID
        sync: false
      - key: WHATSAPP_VERIFY_TOKEN
        sync: false
      - key: VEDIKA_API_KEY
        sync: false
      - key: VEDIKA_API_BASE_URL
        sync: false
    healthCheckPath: /api/healthz
    customDomains:
      - api.smaran.click
```

- [ ] **Step 2: Validate it's well-formed YAML**

```bash
cd /Users/maulik/smaran
python3 -c "import yaml; yaml.safe_load(open('render.yaml')); print('valid YAML')"
```
Expected: `valid YAML`. (This only checks syntax — Render itself validates the schema when the service is created in Task 6.)

- [ ] **Step 3: Commit**

```bash
cd /Users/maulik/smaran
git add render.yaml
git commit -m "chore: add render.yaml for smaran-api production deployment"
```

---

### Task 5: Playwright E2E test for `/api/keepalive`

**Files:**
- Create: `tests/api/keepalive.spec.ts`

**Interfaces:**
- Consumes: `playwright.config.ts`'s `webServer` (boots `api-server` on port 4300), same pattern as `tests/api/health.spec.ts`.

- [ ] **Step 1: Check the prerequisite plan has been executed**

```bash
cd /Users/maulik/smaran
test -f playwright.config.ts && test -f tests/api/health.spec.ts && echo "PREREQUISITE MET" || echo "STOP: run docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md first"
```
If it prints `STOP: ...`, do not proceed with this task — come back after that plan has run. If it prints `PREREQUISITE MET`, continue.

- [ ] **Step 2: Write the test**

`tests/api/keepalive.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("GET /keepalive always returns 200, reporting database as not_configured when DATABASE_URL is unset", async ({ request }) => {
  const res = await request.get("/keepalive");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.database).toBe("not_configured");
  expect(typeof body.timestamp).toBe("string");
});
```
(`playwright.config.ts`'s `webServer` boots `api-server` without a `DATABASE_URL`, so `not_configured` is the correct, deterministic expectation here — matching Task 3 Step 4's manual verification.)

- [ ] **Step 3: Run it**

```bash
cd /Users/maulik/smaran
npm run test:e2e -- tests/api/keepalive.spec.ts
```
Expected: 1 test PASSES.

- [ ] **Step 4: Run the full suite to confirm no regressions**

```bash
cd /Users/maulik/smaran
npm run test:e2e
```
Expected: all tests PASS (7 now: the original 6 from the E2E plan + this one).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add tests/api/keepalive.spec.ts
git commit -m "test: add E2E coverage for GET /api/keepalive"
```

---

### Task 6: Manual infrastructure setup (human-only — cannot be executed by an agent)

**Files:** none — this task is external account configuration, not code.

This task cannot be automated: it requires creating accounts on Render, Supabase, and cron-job.org, and editing DNS at wherever `smaran.click` is registered. Follow this checklist exactly; each step names the exact value to enter.

- [ ] **Step 1: Create the Render service**

Go to render.com → New → Web Service → connect the `smaran` repo. Render will detect `render.yaml` (from Task 4) and pre-fill the service config — confirm it matches: `env: node`, `region: singapore`, `plan: Free`. Do not click "Create" yet — first enter the secret env vars in Step 2 (Render lets you set them before the first deploy).

- [ ] **Step 2: Enter secret environment variables**

In the Render service's Environment tab, set (values from wherever they're currently stored — Meta App Dashboard for the WhatsApp ones, Task 7's Supabase project for `DATABASE_URL`, Vedika's dashboard if going to production tier):
```
DATABASE_URL=<from Task 7's smaran-prod Supabase project connection string>
WHATSAPP_ACCESS_TOKEN=<from Meta App Dashboard, production app>
WHATSAPP_PHONE_NUMBER_ID=<from Meta App Dashboard, production app>
WHATSAPP_VERIFY_TOKEN=<any string you choose — must match Meta's webhook config>
```
Leave `VEDIKA_API_KEY`/`VEDIKA_API_BASE_URL` unset for now (sandbox is fine until the production Vedika tier is actually needed).

- [ ] **Step 3: Deploy and verify**

Click Create/Deploy. Once the build finishes, Render shows a `*.onrender.com` URL. Verify:
```bash
curl -s https://<your-service>.onrender.com/api/healthz
curl -s https://<your-service>.onrender.com/api/keepalive
```
Expected: both return 200. `/api/healthz` returns `{"status":"ok"}`; `/api/keepalive` returns `{"status":"ok","database":"ok"|"not_configured",...}` depending on whether `DATABASE_URL` was set in Step 2.

- [ ] **Step 4: Set up the cron-job.org pinger**

Create a free account at cron-job.org. Add a new cron job:
```
URL:      https://<your-service>.onrender.com/api/keepalive   (switch to https://api.smaran.click/api/keepalive once Task 7's DNS is live)
Schedule: every 5 minutes
Method:   GET
```
Save and enable it. This is the load-bearing piece that keeps the Render free service from spinning down (Render's threshold is ~15 min idle; 5-min pings stay well under it).

- [ ] **Step 5: Confirm the service stays warm**

Wait at least 20 minutes without manually visiting the service, then:
```bash
curl -s -w "\ntime_total: %{time_total}s\n" https://<your-service>.onrender.com/api/healthz
```
Expected: `time_total` well under 1 second (a cold start would show 30-90s). If it's slow, check cron-job.org's job history for failed pings — a failed ping usually means Step 4's URL is wrong or the job got auto-disabled (which would mean `/api/keepalive` returned a non-200 at some point — re-check Task 3's verification).

---

### Task 7: Supabase projects + DNS (human-only — cannot be executed by an agent)

**Files:** none.

- [ ] **Step 1: Create two Supabase free projects**

At supabase.com (or via the Supabase MCP tooling available in this environment), create:
```
smaran-dev   — for local/staging use, never referenced by the deployed Render service
smaran-prod  — the real database, its connection string goes into Task 6 Step 2's DATABASE_URL
```
Both on the free tier.

- [ ] **Step 2: Set up DNS for `api.smaran.click`**

In `smaran.click`'s DNS management (registrar or external DNS provider), after Task 6 Step 1's Render service exists, add the CNAME record Render's dashboard shows for custom domains — typically:
```
Type:  CNAME
Name:  api
Value: <the target Render's dashboard provides, e.g. smaran-api.onrender.com>
```
Then in Render's dashboard, add `api.smaran.click` as a custom domain on the service (this is also what `render.yaml`'s `customDomains` field declares — Render reads it from the file, but the DNS record itself must still be added manually at the registrar).

- [ ] **Step 3: Verify the custom domain resolves**

```bash
curl -s https://api.smaran.click/api/healthz
```
Expected: `{"status":"ok"}`. DNS propagation can take up to a few hours — if this fails immediately after Step 2, wait and retry before assuming something's misconfigured.

- [ ] **Step 4: Register the Meta webhook against the custom domain**

In the Meta App Dashboard (production app, once business-verified — outside this plan's scope), set the webhook callback URL to `https://api.smaran.click/api/whatsapp/webhook` and the verify token to match Task 6 Step 2's `WHATSAPP_VERIFY_TOKEN`. Remember the two-step subscription gotcha already documented in `docs/superpowers/AGENT-PROMPT-TEMPLATE.md`'s traps log: entering the URL alone is not enough, you must also click "Subscribe" on the "messages" field.

---

### Task 8: Document the deployed topology in the KB

**Files:**
- Modify: `knowledgebase/01-Architecture/smaran-platform-architecture.md`

- [ ] **Step 1: Check the prerequisite plan has been executed**

```bash
cd /Users/maulik/smaran
test -f knowledgebase/01-Architecture/smaran-platform-architecture.md && echo "PREREQUISITE MET" || echo "STOP: run docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md first"
```
If it prints `STOP: ...`, do not proceed — come back after that plan has run.

- [ ] **Step 2: Append a Deployment section**

Append to the end of `knowledgebase/01-Architecture/smaran-platform-architecture.md`:
```markdown

## Deployment

Production: one Render free Web Service (`smaran-api`, `render.yaml` at repo root),
kept perpetually warm by an external pinger (cron-job.org, every 5 min) hitting
`GET /api/keepalive` — ported from `/Users/maulik/streethawk`'s minibag project,
which discovered the pattern the hard way (a strict health-check endpoint gets
external pingers auto-disabled on any transient failure; `/keepalive` always
returns 200 regardless of DB state). Database: Supabase free project
(`smaran-prod`). Custom domain: `api.smaran.click`.

No persistent staging host — Render's free tier shares a 750 free instance-hour/
month budget across the whole workspace, and keeping even one service perpetually
warm already consumes nearly all of it (the same reason minibag's own design docs
give for never running a second free Render service). Staging is local dev
(`pnpm --dir code --filter @workspace/api-server run dev`, the same command the
root Playwright suite boots) against a separate `smaran-dev` Supabase project and
a separate Meta WhatsApp test app.

Full design: `docs/superpowers/specs/2026-07-13-staging-prod-infra-design.md`.
```

- [ ] **Step 3: Bump the doc's freshness marker**

At the top of `knowledgebase/01-Architecture/smaran-platform-architecture.md`, update:
```
<!-- _last_updated: 2026-07-13 -->
```
to today's actual date when this task is executed.

- [ ] **Step 4: Commit**

```bash
cd /Users/maulik/smaran
git add knowledgebase/01-Architecture/smaran-platform-architecture.md
git commit -m "docs: record deployment topology in the KB architecture doc"
```
