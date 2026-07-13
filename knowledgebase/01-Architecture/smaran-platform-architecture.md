# Platform Architecture

<!-- _last_updated: 2026-07-13 -->

## Overview

Smaran's repo (`/Users/maulik/smaran`) is two things stacked in one git history: an outer root
holding documentation/planning/E2E tests, and `code/`, a pnpm workspace holding the actual
application code. This mirrors a pattern used elsewhere (see `/Users/maulik/streethawk`'s root
vs `minibag/` split) — the outer root is not part of the pnpm workspace and has its own,
separate `package.json`.

## Repo Structure

```
smaran/                       ← git root
├── CLAUDE.md                  ← working rules (GEMINI.md, AGENTS.md symlink here)
├── docs/                       ← blueprint-v3, ideating-toolset, design ref screenshots,
│                                   superpowers/{specs,plans}
├── .planning/                   ← GSD: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, intel/
├── knowledgebase/                ← this KB
├── tests/api/                     ← root Playwright E2E suite (API-level, see below)
├── playwright.config.ts
└── code/                           ← pnpm workspace (separate package.json/pnpm-workspace.yaml)
    ├── artifacts/
    │   ├── api-server/              ← Express + esbuild, PORT env required, mounted at /api
    │   │   └── src/routes/            health.ts, panchang.ts, whatsapp.ts
    │   ├── smaran/                   ← React/Vite mockup dashboard, Tailwind v4 + shadcn/ui
    │   └── mockup-sandbox/            ← React/Vite mockup sandbox, Tailwind v4 + shadcn/ui
    ├── lib/
    │   ├── api-zod/                   ← shared Zod schemas (request/response contracts)
    │   ├── api-client-react/           ← generated React Query hooks from api-zod
    │   ├── api-spec/                    ← OpenAPI spec generation
    │   └── db/                           ← Drizzle ORM (schema not yet populated)
    └── scripts/
```

## api-server routes (all mounted under `/api`, see `code/artifacts/api-server/src/app.ts`)

| Route | Method | Purpose |
|---|---|---|
| `/healthz` | GET | Liveness check |
| `/panchang` | GET | Proxies Vedika's Panchang (lunar calendar) API — sandbox by default (fixed mock payload, no key needed), switches to production when `VEDIKA_API_KEY` is set |
| `/whatsapp/send` | POST | Sends a WhatsApp message via Meta Cloud API — 502s cleanly if `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` unset |
| `/whatsapp/webhook` | GET | Meta's webhook URL verification handshake (`hub.mode`/`hub.verify_token`/`hub.challenge`) |
| `/whatsapp/webhook` | POST | Receives inbound WhatsApp messages, stores in an in-memory ring buffer (50 max, not persisted) |
| `/whatsapp/messages` | GET | Lists received inbound messages, most recent first |

These routes are the actual, testable product surface today — covered by the root Playwright
suite (`tests/api/*.spec.ts`). See `code/.agents/memory/smaran-product.md` for integration
quirks discovered while building them (Vedika sandbox always returns a fixed 1995-01-01 mock;
WhatsApp test-mode webhook subscription is a two-step process in the Meta dashboard).

## Mockup apps (`code/artifacts/{smaran,mockup-sandbox}`)

React/Vite + Tailwind v4 (CSS-first `@theme`, no JS `tailwind.config`) + shadcn/ui (`new-york`
style). Preview surfaces for WhatsApp card content and value-ladder UI states — explicitly
**not** the shipped product (the real product has no consumer web UI, see the negative
constraints in `code/.agents/memory/smaran-product.md`).

A shared `@workspace/design-tokens` package unifying both apps' brand tokens (currently
duplicated) is designed in `docs/superpowers/specs/2026-07-13-design-tokens-branding-design.md`
and planned in `docs/superpowers/plans/2026-07-13-design-tokens-branding.md` — **not yet
executed** as of this doc's `_last_updated`. Check those files' status before assuming the
shared package exists.

## E2E testing (`tests/api/`, root Playwright project)

API-level only — the product's testable surface is `api-server`'s HTTP routes, not the mockup
UIs. `playwright.config.ts` boots `api-server` itself via `pnpm --dir code --filter
@workspace/api-server run dev` on port 4300, with a throwaway `WHATSAPP_VERIFY_TOKEN` set for
the test process only. No browser binaries are installed — `request`-context tests don't need
them. Run with `npm run test:e2e` from the repo root.

## Roadmap relationship

`.planning/ROADMAP.md` defines the 7 build phases (Foundation/Onboarding → Ingestion →
Corroborated Payments → Daily Brain → Schedule Protection → Family Calendar → Referral). None
have started as of this doc's `_last_updated` — this architecture doc describes what's in the
codebase today (scaffolding + test routes + mockups), not the planned end state. Don't treat
ROADMAP.md phases as built until this doc is updated to say so.

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

As of this doc's `_last_updated`, none of this is provisioned yet — `render.yaml`,
the `/api/keepalive` route, and `.env.example` are all implemented and verified
locally (see `docs/superpowers/plans/2026-07-13-staging-prod-infra.md` Tasks 1-5),
but the Render service, both Supabase projects, the cron-job.org pinger, and the
`api.smaran.click` DNS record (Tasks 6-7, manual/external) have not been created.

Full design: `docs/superpowers/specs/2026-07-13-staging-prod-infra-design.md`.
