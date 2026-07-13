# Knowledgebase, Root E2E Testing, and Agent Guardrails Setup

Date: 2026-07-13

## Context

Two prior artifacts already exist and inform this design:
- `code/artifacts/api-server` — a real, manually-verified Express API with three route files: `health.ts` (`GET /api/healthz`), `panchang.ts` (`GET /api/panchang`, proxies Vedika's sandbox), `whatsapp.ts` (`POST /api/whatsapp/send`, `GET/POST /api/whatsapp/webhook`, `GET /api/whatsapp/messages`). All mounted under `/api` (`code/artifacts/api-server/src/app.ts:29`).
- `code/.agents/memory/smaran-product.md` — already documents the product's negative constraints and integration quirks (Vedika sandbox always returns a fixed mock payload; WhatsApp test-mode two-step webhook subscription gotcha).

The user's reference implementation is `/Users/maulik/streethawk` (a separate, unrelated repo), which has an established practice for three things we're adopting here:
1. A `knowledgebase/` (Obsidian-style, numbered folders `00-Meta` … `05-Logbook`) documenting architecture/intent, kept in sync with code via a `last_updated`-vs-file-mtime freshness script and an on-demand audit command.
2. A root `CLAUDE.md` with `GEMINI.md`/`AGENTS.md` symlinked to it, covering repo structure, working rules, and guardrails — plus a separate `.agents/AGENTS.md` short rules file for project-specific dos/don'ts.
3. A root-level test suite (Playwright, in streethawk's case broader) that is architecturally separate from the nested app workspace (streethawk root vs `minibag/`; here: smaran root vs `code/`).

No file called an "external agent prompt template" was found anywhere in streethawk after searching by name and content — the closest, confirmed match is `.agents/AGENTS.md`, which this design adopts.

## Goal

Stand up the same three practices for Smaran, adapted to what actually exists here (a pre-implementation project — only scaffolding + the api-server test routes are real), not padded with speculative documentation for unbuilt features.

## Non-goals

- No UI/browser E2E in this pass — the product is WhatsApp-only (locked constraint); the two mockup apps are prototypes, not the tested surface. API-level Playwright tests against `api-server` are the real product surface.
- No documentation of ROADMAP.md phases 1-7 in the KB — those aren't built yet and already live in `.planning/`. The KB documents what exists in code today.
- No CI wiring for the new `test:e2e` script — runnable manually/later, not blocking this setup.
- No git hook for KB freshness (streethawk has a `PostToolUse` hook after `git commit`) — the freshness script and `/kb-audit`-equivalent are added as tooling, but hook wiring is left for a follow-up if the team wants it enforced automatically.

## Design

### 1. Root layout

New standalone npm project at `/Users/maulik/smaran` (the outer root), separate from `code/`'s pnpm workspace — same relationship as streethawk root vs `minibag/`:

```
smaran/
  package.json           — new, plain npm, "smaran-e2e", devDep @playwright/test only
  playwright.config.ts
  tsconfig.json           — minimal, for editor support
  tests/api/
    health.spec.ts
    panchang.spec.ts
    whatsapp.spec.ts
  knowledgebase/
    00-Meta/smaran-index.md
    01-Architecture/smaran-platform-architecture.md
    05-Logbook/2026-07-13-initial-kb-and-e2e-setup.md
  scripts/kb-freshness.mjs
  CLAUDE.md
  GEMINI.md → CLAUDE.md   (symlink)
  AGENTS.md → CLAUDE.md   (symlink)
  .agents/AGENTS.md       — short project-specific agent rules (new; distinct from code/.agents/memory/)
```

`code/` is untouched — its own pnpm workspace, own `.agents/memory/` (long-form integration notes), continues as-is. The new root `.agents/AGENTS.md` is a different, shorter artifact: quick do/don't rules (streethawk's has ~2), not integration write-ups.

### 2. Playwright E2E — API-level only

Rationale: the real, testable product surface today is `api-server`'s three routes — all independently testable without live third-party credentials (Vedika sandbox needs no key; WhatsApp send correctly 502s without Meta creds; the webhook verify handshake only needs a throwaway local token, not a real secret).

Coverage:
| Route | Test |
|---|---|
| `GET /healthz` | 200, `{status:"ok"}` |
| `GET /panchang` | 200, structural shape assertions (sandbox payload is Vedika's fixed fixture — assert types/required fields, not their exact mock values) |
| `POST /whatsapp/send` (no creds) | 502, error message mentions "not configured" |
| `GET /whatsapp/webhook` verify | matching `hub.verify_token` → 200 + echoed challenge; mismatched → 403 |
| `POST /whatsapp/webhook` inbound → `GET /whatsapp/messages` | full loop: post a synthetic inbound message, confirm it's retrievable |

`playwright.config.ts` boots the server itself via Playwright's `webServer` option: `pnpm --dir code --filter @workspace/api-server run dev`, with `PORT=4300` and a throwaway `WHATSAPP_VERIFY_TOKEN` set only for the test process's environment (not a real secret, not committed anywhere sensitive). `baseURL` = `http://localhost:4300/api`. No browser binaries installed — `request`-only tests don't need them.

### 3. Knowledgebase

Adopts streethawk's folder numbering and `_last_updated` HTML-comment convention, but seeded lean:
- `00-Meta/smaran-index.md` — master index (file table + quick search + package structure + env vars), same shape as streethawk's `sh-index.md`.
- `01-Architecture/smaran-platform-architecture.md` — what exists today: `code/` pnpm workspace (`artifacts/{smaran,mockup-sandbox,api-server}`, `lib/*`), the root E2E project, the design-tokens system, the `.planning/` roadmap relationship.
- `05-Logbook/2026-07-13-initial-kb-and-e2e-setup.md` — dated entry documenting this setup, establishing the logbook pattern.

**Git-tracked, not gitignored** (unlike streethawk's local-only choice) — the user's ask was to "record and track" docs, and everything else in this repo (`.planning/`, `docs/`) is already committed; gitignoring just the KB would be inconsistent with the rest of the repo's practice.

`scripts/kb-freshness.mjs` — adapted from streethawk's drift detector: parses each KB doc's `<!-- _last_updated: YYYY-MM-DD -->` comment and any file paths it cites in backticks, flags docs whose cited paths have a newer mtime than the doc. Exposed as `npm run kb:freshness`. No PostToolUse hook or `/kb-audit` slash command in this pass (non-goal above) — the script alone establishes the mechanism; wiring it into a hook/command is a natural follow-up once there's enough KB content for drift to matter.

### 4. CLAUDE.md + guardrails

Root `CLAUDE.md` sections, adapted from streethawk's structure:
- **Repo structure** — this is a two-project repo (root E2E project vs `code/` pnpm app workspace), mirroring the "always specify CWD" warning streethawk gives for its own root-vs-`minibag/` split, adapted to root-vs-`code/`.
- **Product constraint (guardrail)** — one paragraph restating WhatsApp-only/no-web-UI, pointing at `code/.agents/memory/smaran-product.md` for the full detail rather than duplicating it (DRY — single source of truth for that content already exists).
- **Running tests** — `npm run test:e2e` from root; `pnpm --filter @workspace/smaran run typecheck` etc. from `code/` for the app workspace.
- **Knowledgebase** section — same "code is ground truth, KB drifts, refresh after features land" discipline as streethawk's, condensed (we don't yet have streethawk's multi-week drift history to justify the longer version).

`GEMINI.md` and `AGENTS.md` symlink to `CLAUDE.md`, exactly as in streethawk.

`.agents/AGENTS.md` (new, short rules file) seeded with one concrete rule already established this session: never hardcode colors or use inline `style={{}}` in `artifacts/smaran`/`artifacts/mockup-sandbox` — enforced by the ESLint rule from the design-tokens work, referenced here so agents know the rule exists before they hit the lint error.

## Open items

None — git-tracked-KB was flagged as a judgment call and approved implicitly by design sign-off; no other ambiguity remains.
