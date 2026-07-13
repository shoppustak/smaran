# Staging & Production Infrastructure

Date: 2026-07-13

## Context

Smaran's real product interface is WhatsApp-only (locked constraint, `code/.agents/memory/smaran-product.md`) — the only thing that needs hosting is `code/artifacts/api-server` (health, Vedika Panchang proxy, WhatsApp Cloud API webhook/send) and, eventually, its Postgres database (`code/lib/db`, Drizzle, schema not yet populated). No frontend needs deploying: the two mockup apps are internal preview tools, never shipped.

The user runs a sibling project (`/Users/maulik/streethawk`'s `minibag/`) on Render free tier + Supabase, with a proven keep-alive pattern refined over three iterations (GitHub Actions polling → external cron pinging `/health/ready` → external cron pinging a dedicated always-200 `/keepalive` endpoint). That project's own design docs record a hard constraint discovered the hard way: Render's free tier shares a **750 free instance-hours/month budget across the whole workspace**, and minibag explicitly avoided running a second free web service because keeping even one perpetually warm (~730h/month) already consumes nearly the entire budget.

## Goal

A $0/month staging+production setup for when Smaran's backend moves from test routes to the real ROADMAP build, reusing the proven minibag pattern rather than reinventing it, while respecting the 750h constraint that ruled out minibag's own two-service alternative.

## Non-goals

- No persistent staging host — the 750h budget doesn't support two always-warm free services, and there's no current need for a shareable non-engineer staging URL. Revisit only if that need materializes (documented alternative: ~$7/mo paid-prod tier, freeing the full free budget for a staging service).
- No staging domain — only production gets a custom subdomain (see Section 6); staging has no persistent host to point one at.
- No Render Cron / `pg_cron` for the Daily Brain job — an in-process scheduler works because the keepalive pinger already keeps the process alive 24/7, and adds no new infrastructure.
- Does not cover Meta Business verification / production WhatsApp number provisioning — that's a Meta-side process with its own timeline, not a hosting decision. Noted as a prerequisite, not designed here.

## Design

### 1. Topology

**Production:** one Render free `Web Service` running `code/artifacts/api-server`, kept perpetually warm by an external pinger (cron-job.org, free) hitting a dedicated `GET /keepalive` endpoint every 5 minutes. One Supabase free project (`smaran-prod`) as the real database.

**Staging:** no persistent host. Local `pnpm --dir code --filter @workspace/api-server run dev` (the same command the Playwright E2E suite already boots), pointed at a separate Supabase free project (`smaran-dev`) and a separate Meta WhatsApp *test* app/number — spun up on demand, not deployed anywhere. This mirrors minibag's own resolved shape (one backend, no second Render service) for the identical budget reason.

### 2. Keepalive endpoint (ports minibag's proven pattern)

New route, `code/artifacts/api-server/src/routes/keepalive.ts`, mounted at `GET /api/keepalive`:
- Runs a trivial DB query (once `lib/db` has real tables) to keep Supabase's free-tier project from pausing (Supabase free tier pauses after ~1 week of inactivity).
- **Always returns HTTP 200**, even if the DB query fails — this is the load-bearing detail from minibag's own incident history: a strict health check that 503s on a cold/failed DB gets external pingers like cron-job.org to auto-disable the job after repeated failures, which is exactly how their first pinger silently died. `/api/healthz` stays a strict check (existing behavior, untouched); `/api/keepalive` is deliberately lenient.
- Response body reports actual DB state (`{status: "ok", database: "ok" | "cold", timestamp}`) so the always-200 contract doesn't hide real problems from anyone reading logs/responses — only the HTTP status is unconditional.

Configured on cron-job.org's dashboard (external, not code): `GET https://<render-service>.onrender.com/api/keepalive` every 5 minutes. This is a manual account-setup step, not something committed to the repo.

### 3. Render deployment config

`render.yaml` at the repo root (`/Users/maulik/smaran/render.yaml`), modeled on minibag's:
- One `type: web` service, `env: node`, `plan: free`, `region: singapore` (same region minibag uses — closest to India, and consistent with Vedika's hardcoded default coordinates in `panchang.ts`, Varanasi).
- `buildCommand`: installs the `code/` pnpm workspace and builds `api-server` (`pnpm --dir code install && pnpm --dir code --filter @workspace/api-server run build`).
- `startCommand`: `node code/artifacts/api-server/dist/index.mjs`.
- `healthCheckPath`: `/api/healthz` (Render's own platform health check — separate concern from the external keepalive pinger; Render uses this to know the deploy succeeded, not to keep it warm).
- `customDomains: [api.smaran.click]` (see Section 6).
- Secrets (`DATABASE_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `VEDIKA_API_KEY`) declared with `sync: false` — entered manually in Render's dashboard, never committed, exactly like minibag's `render.yaml`.

### 4. Environment separation

Reuses the pattern already live in `code/artifacts/api-server/src/routes/panchang.ts` (`VEDIKA_API_KEY` presence flips sandbox→production base URL) rather than introducing a new mechanism — same shape extends naturally to `DATABASE_URL` (dev vs prod Supabase project) and the `WHATSAPP_*` trio (test app vs production app credentials). One codebase, environment-variable-driven, no environment-specific code branches beyond what already exists.

This is also already the exact discipline written into `docs/superpowers/AGENT-PROMPT-TEMPLATE.md`'s Database section (confirm target isn't production before any migrate/push) — this design is what makes that section concrete once a real `DATABASE_URL` exists.

### 5. Daily Brain scheduling (ROADMAP Phase 4 — mechanism decided now, not built now)

When Phase 4 lands: an in-process scheduler (`node-cron` or equivalent) inside `api-server`, not a separate Render Cron service or Supabase `pg_cron` job. This only works because the keepalive pinger already guarantees the process is alive 24/7 (Render's 15-minute sleep threshold never triggers, since pings arrive every 5 minutes) — the same reasoning minibag's own Phase 4-equivalent doc gives for its in-process sweep loops. No new infrastructure needed at that point, just a dependency add and the scheduled function itself.

### 6. Domain

`smaran.click` is already owned — no reason to defer. Production gets a custom subdomain, `api.smaran.click`, pointed at the Render service via a CNAME, mirroring minibag's `api.localloops.cc` pattern exactly (`render.yaml`'s `customDomains` field, set up once the Render service exists — Render issues the TLS cert automatically). This gives a stable, portable webhook URL from day one instead of depending on Render's own subdomain, at no recurring cost since the domain is already sunk. Meta's webhook is registered against `https://api.smaran.click/api/whatsapp/webhook`, not the `onrender.com` URL.

## Prerequisites this design does not cover (manual, external, non-hosting)

- A Render account + the `smaran-prod` free web service, created via Render's dashboard connected to this repo.
- DNS: a CNAME for `api.smaran.click` pointed at the Render service, added wherever `smaran.click`'s DNS is managed (registrar dashboard or an external DNS provider) — Render's dashboard provides the exact target once the service exists.
- Two Supabase free projects (`smaran-dev`, `smaran-prod`), created via Supabase's dashboard (or the Supabase MCP tooling already available in this environment).
- A cron-job.org account + the `/api/keepalive` pinger job, configured on their dashboard.
- Meta Business verification + a production WhatsApp Business phone number, for when the product moves off test-mode — a Meta-side process, own timeline, not designed here.

## Open items

None — the one real fork (persistent staging host vs none) was resolved during design (none, for the 750h-budget reason established by direct precedent).
