# Smaran Docs — Master Index

<!-- _last_updated: 2026-07-13 -->

## Files

| File | What's in it |
|---|---|
| [[smaran-platform-architecture]] | Repo structure: code/ pnpm workspace, root E2E project, docs/, .planning/ |

## Quick Search

- Repo layout / where things live: [[smaran-platform-architecture]]
- API routes (health/panchang/whatsapp): [[smaran-platform-architecture]]
- Product roadmap & requirements: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`
- Negative constraints (WhatsApp-only, no web UI): `code/.agents/memory/smaran-product.md`

## App Overview

Smaran is a WhatsApp-native ledger/calendar for independent Hindu priests (purohits). The real
product interface is WhatsApp only — Postgres is the system of record, there is no shipped
consumer web UI (locked constraint, see `code/.agents/memory/smaran-product.md`).

As of this writing the codebase is pre-implementation: `code/artifacts/api-server` has three
working test routes (health, Vedika Panchang proxy, WhatsApp Cloud API send/webhook), and
`code/artifacts/{smaran,mockup-sandbox}` are React/Vite mockup apps used to preview UI states —
not the shipped product. Phases 1-7 of the actual build are planned in `.planning/ROADMAP.md`
and not yet started.

## Package Structure

```
smaran/
├── knowledgebase/        ← this KB
├── docs/                  ← blueprint, ideating toolset, design ref, superpowers specs/plans
├── .planning/              ← GSD roadmap/requirements/state
├── tests/api/               ← root Playwright E2E suite (this project)
├── playwright.config.ts
└── code/                    ← pnpm workspace (the actual app)
    ├── artifacts/
    │   ├── api-server/       ← Express API: health, panchang, whatsapp routes
    │   ├── smaran/            ← React/Vite mockup dashboard (branded)
    │   └── mockup-sandbox/    ← React/Vite mockup sandbox (branded)
    └── lib/                    ← api-zod, db, api-client-react, api-spec
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | Yes (api-server) | Express listen port — server throws on boot if unset |
| `VEDIKA_API_KEY` | No | Switches Panchang route from sandbox to production Vedika API |
| `VEDIKA_API_BASE_URL` | No | Override Vedika API base (default `https://api.vedika.io`) |
| `WHATSAPP_ACCESS_TOKEN` | No | Meta Graph API bearer token for outbound sends |
| `WHATSAPP_PHONE_NUMBER_ID` | No | Meta phone number id for outbound sends |
| `WHATSAPP_VERIFY_TOKEN` | No | Shared secret for the webhook GET verify handshake |
