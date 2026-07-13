# Knowledgebase, Root E2E Testing, and Agent Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up three practices adopted from `/Users/maulik/streethawk` at the Smaran repo root: a `knowledgebase/` for architecture/intent docs, a root-level Playwright E2E suite testing `code/artifacts/api-server`'s real routes, and `CLAUDE.md`/`GEMINI.md`/`AGENTS.md` + a short `.agents/AGENTS.md` rules file.

**Architecture:** A new, standalone npm project at the repo root (`/Users/maulik/smaran`), separate from `code/`'s pnpm workspace — same relationship as streethawk's root vs `minibag/`. Playwright drives `code/artifacts/api-server` via its `webServer` option and tests only HTTP responses (`request` fixture, no browser). The KB is git-tracked, seeded with exactly what exists in code today (not the unbuilt roadmap).

**Tech Stack:** `@playwright/test` (API-only, no browser binaries), plain Node scripts (`kb-freshness.mjs`), npm (root) alongside the existing pnpm workspace (`code/`).

## Global Constraints

- The outer root gets its own `package.json` (npm) — it is NOT added to `code/`'s pnpm workspace and does not use `catalog:` references.
- Playwright tests are **API-level only** against `code/artifacts/api-server` — no browser, no UI test of the mockup apps (locked decision from the approved spec).
- The KB is **git-tracked** (not gitignored like streethawk's) — confirmed and committed to as part of the approved spec.
- KB docs use the `<!-- _last_updated: YYYY-MM-DD -->` inline-comment convention (matches streethawk) so `kb-freshness.mjs` can parse it.
- `GEMINI.md` and `AGENTS.md` are symlinks to `CLAUDE.md` (`ln -s`), not separate files with duplicated content.
- **First-time `pnpm install` on macOS requires an extra step**: `code/pnpm-workspace.yaml`'s `overrides` block deliberately strips non-Linux esbuild binaries (Replit targets `linux-x64` in production) and macOS's `pnpm install` hits an `[ERR_PNPM_IGNORED_BUILDS]` gate for esbuild's postinstall script. This was already hit and fixed once during this plan's own verification — `code/pnpm-workspace.yaml` now has an `allowBuilds: { esbuild: true }` block (already committed, commit `28fde03`). If a fresh clone still hits this, run `pnpm --dir code approve-builds --all`.

---

### Task 1: Scaffold the root npm project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

**Interfaces:**
- Produces: `npm run test:e2e` and `npm run kb:freshness` scripts, used by Tasks 2 and 3.

- [ ] **Step 1: Create the root package manifest**

`package.json`:
```json
{
  "name": "smaran-e2e",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test",
    "kb:freshness": "node scripts/kb-freshness.mjs"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@types/node": "^25.3.3",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 2: Create the root tsconfig**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["playwright.config.ts", "tests"]
}
```

- [ ] **Step 3: Install**

```bash
cd /Users/maulik/smaran
npm install
```
Expected: succeeds, creates `package-lock.json` and `node_modules/` at the repo root (separate from `code/node_modules`).

- [ ] **Step 4: Commit**

```bash
cd /Users/maulik/smaran
git add package.json package-lock.json tsconfig.json
git commit -m "chore: scaffold root npm project for E2E testing"
```

---

### Task 2: Playwright config + API E2E tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/api/health.spec.ts`
- Create: `tests/api/panchang.spec.ts`
- Create: `tests/api/whatsapp.spec.ts`

**Interfaces:**
- Consumes: `code/artifacts/api-server`'s routes (`/api/healthz`, `/api/panchang`, `/api/whatsapp/*`), booted via `pnpm --dir code --filter @workspace/api-server run dev`.

- [ ] **Step 1: Ensure `code/` dependencies are installed and build scripts approved**

```bash
cd /Users/maulik/smaran
pnpm --dir code install
```
Expected: succeeds. If you see `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.27.3`, run:
```bash
pnpm --dir code approve-builds --all
```
(This has already been done once during this plan's own verification — `code/pnpm-workspace.yaml` commit `28fde03` — so a fresh install from that commit onward should not hit this. Included here in case of a lockfile change that reintroduces it.)

- [ ] **Step 2: Verify `api-server` builds and boots manually**

```bash
cd /Users/maulik/smaran
pnpm --dir code --filter @workspace/api-server run build
PORT=4300 WHATSAPP_VERIFY_TOKEN=e2e-test-verify-token node code/artifacts/api-server/dist/index.mjs &
sleep 1.5
curl -s http://localhost:4300/api/healthz
kill %1
```
Expected: `curl` prints `{"status":"ok"}`.

- [ ] **Step 3: Create the Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}/api`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: "pnpm --dir code --filter @workspace/api-server run dev",
    env: {
      PORT: String(PORT),
      WHATSAPP_VERIFY_TOKEN: "e2e-test-verify-token",
    },
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 4: Write `health.spec.ts`**

`tests/api/health.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("GET /healthz returns ok status", async ({ request }) => {
  const res = await request.get("/healthz");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
```

- [ ] **Step 5: Write `panchang.spec.ts`**

`tests/api/panchang.spec.ts` (structural assertions only — the sandbox payload is Vedika's own fixed mock fixture, not ours to assert exact values on; verified live during this plan's authoring that the sandbox returns `source: "sandbox"` and this exact shape):
```ts
import { test, expect } from "@playwright/test";

test("GET /panchang returns a structurally valid sandbox payload", async ({ request }) => {
  const res = await request.get("/panchang");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.source).toBe("sandbox");
  expect(typeof body.date).toBe("string");
  expect(typeof body.tithi.name).toBe("string");
  expect(typeof body.tithi.paksha).toBe("string");
  expect(typeof body.tithi.number).toBe("number");
  expect(typeof body.nakshatra.name).toBe("string");
  expect(typeof body.nakshatra.lord).toBe("string");
  expect(typeof body.masa.name).toBe("string");
  expect(typeof body.overallAuspiciousness).toBe("string");
  expect(typeof body.summary).toBe("string");
  expect(Array.isArray(body.bestActivities)).toBe(true);
  expect(Array.isArray(body.activitiesToAvoid)).toBe(true);
  expect(typeof body.dishaShool.direction).toBe("string");
});
```

- [ ] **Step 6: Write `whatsapp.spec.ts`**

`tests/api/whatsapp.spec.ts` (all four assertions verified live during this plan's authoring — exact status codes and error text confirmed against the running server):
```ts
import { test, expect } from "@playwright/test";

test.describe("WhatsApp Cloud API test layer", () => {
  test("POST /whatsapp/send fails clearly when credentials are not configured", async ({ request }) => {
    const res = await request.post("/whatsapp/send", {
      data: { to: "15551234567", message: "test" },
    });
    expect(res.status()).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("not configured");
  });

  test("GET /whatsapp/webhook verifies with a matching token", async ({ request }) => {
    const res = await request.get("/whatsapp/webhook", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": "e2e-test-verify-token",
        "hub.challenge": "challenge-123",
      },
    });
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe("challenge-123");
  });

  test("GET /whatsapp/webhook rejects a mismatched token", async ({ request }) => {
    const res = await request.get("/whatsapp/webhook", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "challenge-123",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /whatsapp/webhook records an inbound text message, visible via GET /whatsapp/messages", async ({ request }) => {
    const from = "15559998888";
    const text = `e2e probe ${Date.now()}`;

    const webhookRes = await request.post("/whatsapp/webhook", {
      data: {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [{ from, type: "text", text: { body: text } }],
                },
              },
            ],
          },
        ],
      },
    });
    expect(webhookRes.status()).toBe(200);

    const messagesRes = await request.get("/whatsapp/messages");
    const messages = await messagesRes.json();
    expect(messages[0]).toMatchObject({ from, text });
  });
});
```

- [ ] **Step 7: Run the suite**

```bash
cd /Users/maulik/smaran
npm run test:e2e
```
Expected: Playwright boots `api-server` on port 4300 and all tests PASS (6 tests: 1 health + 1 panchang + 4 whatsapp).

- [ ] **Step 8: Commit**

```bash
cd /Users/maulik/smaran
git add playwright.config.ts tests/
git commit -m "test: add root Playwright E2E suite for api-server routes"
```

---

### Task 3: Knowledgebase scaffold + freshness script

**Files:**
- Create: `knowledgebase/00-Meta/smaran-index.md`
- Create: `knowledgebase/01-Architecture/smaran-platform-architecture.md`
- Create: `knowledgebase/05-Logbook/2026-07-13-initial-kb-and-e2e-setup.md`
- Create: `scripts/kb-freshness.mjs`

**Interfaces:**
- Produces: `npm run kb:freshness` (uses Task 1's script entry).

- [ ] **Step 1: Create the KB index**

`knowledgebase/00-Meta/smaran-index.md`:
```markdown
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
```

- [ ] **Step 2: Create the architecture doc**

`knowledgebase/01-Architecture/smaran-platform-architecture.md`:
```markdown
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
```

- [ ] **Step 3: Create the first logbook entry**

`knowledgebase/05-Logbook/2026-07-13-initial-kb-and-e2e-setup.md`:
```markdown
# 2026-07-13 — Initial KB, root Playwright E2E, and agent guardrails setup

Bootstrapped three practices adopted from `/Users/maulik/streethawk`'s established pattern:

1. **Knowledgebase** (`knowledgebase/`) — this KB, seeded lean (index + one architecture doc)
   since Smaran is pre-implementation; not padded with docs for unbuilt ROADMAP phases.
2. **Root Playwright E2E** (`tests/api/`) — API-level tests against `code/artifacts/api-server`'s
   three real routes (health, panchang, whatsapp). Chose API-level over browser UI because the
   product is WhatsApp-only (no shipped web UI); the mockup apps aren't the tested surface.
3. **CLAUDE.md + GEMINI.md/AGENTS.md symlinks + `.agents/AGENTS.md`** — working rules and a short
   project-specific rules file, mirroring streethawk's split between long-form integration notes
   (`code/.agents/memory/`, pre-existing) and short guardrail rules (`.agents/AGENTS.md`, new).

Unlike streethawk's KB (gitignored, local-only), this KB is **git-tracked** — the ask was to
"record and track" architectural docs, and everything else in this repo is already committed.

Also added `scripts/kb-freshness.mjs`, adapted from streethawk's drift detector but simplified
to a single target (no separate nested-repo split like streethawk/minibag — this repo's `code/`
is a plain subdirectory of the same git history, not a separate `.git`).

No PostToolUse hook or `/kb-audit` slash command yet — the freshness script alone establishes
the mechanism; wiring automation is a follow-up once there's enough KB content for drift to
matter.
```

- [ ] **Step 4: Create the freshness script**

`scripts/kb-freshness.mjs` (adapted from streethawk's `scripts/kb-freshness.mjs`, simplified to
a single target — this repo has one git history, not a nested separate repo):
```js
#!/usr/bin/env node
// kb-freshness.mjs — flag Knowledgebase docs that lag the code they document.
//
// For each KB doc, take its `_last_updated` (inline comment, falling back to file
// mtime) and count git commits since that date touching the code paths the doc
// cites in its own body (e.g. `code/artifacts/api-server/src/routes/health.ts`).
// A doc is STALE if its own cited code changed after it was last updated. Docs
// that cite no code paths fall back to a repo-wide check under `code/`.
//
// This is a re-check signal, not a verdict. Code is always ground truth.
//
// Usage:
//   node scripts/kb-freshness.mjs            # full report (exit 1 if any stale)
//   node scripts/kb-freshness.mjs --quiet    # print only if stale (hooks/CI)
//   node scripts/kb-freshness.mjs --json     # machine-readable
//   node scripts/kb-freshness.mjs --days=21  # ignore docs newer than N days behind (default 14)

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KB_DIR = join(ROOT, "knowledgebase");
const args = process.argv.slice(2);
const QUIET = args.includes("--quiet");
const JSON_OUT = args.includes("--json");
const DAYS = Number((args.find((a) => a.startsWith("--days=")) || "--days=14").split("=")[1]) || 14;
const FALLBACK_PATHS = ["code/artifacts", "code/lib"];
const SKIP = [/\/\.obsidian\//];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function docDate(text, file) {
  const inline = text.match(/_last_updated:\s*(\d{4}-\d{2}-\d{2})/);
  if (inline) return { date: inline[1], source: "inline" };
  return { date: statSync(file).mtime.toISOString().slice(0, 10), source: "mtime" };
}

// Pull code paths the doc references in its body. Directory-level granularity
// keeps the git query stable across file renames within a subsystem.
function citedPaths(text) {
  const re = /\b((?:code|docs|\.planning)\/[A-Za-z0-9_./-]+)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(text))) {
    let p = m[1].replace(/[.,`)]+$/, "");
    if (/\.[a-z]{2,4}$/.test(p)) p = p.slice(0, p.lastIndexOf("/"));
    if (p && p.split("/").length >= 2) set.add(p);
  }
  return [...set];
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function commitsSince(paths, date) {
  const out = git(`log --oneline --since=${date}T00:00:00 -- ${paths.map((p) => JSON.stringify(p)).join(" ")}`);
  return out ? out.split("\n").filter(Boolean).length : 0;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

const today = new Date().toISOString().slice(0, 10);
const rows = [];

for (const f of walk(KB_DIR).filter((f) => !SKIP.some((re) => re.test(f)))) {
  const text = readFileSync(f, "utf8");
  const { date, source } = docDate(text, f);
  let paths = citedPaths(text);
  const mapped = paths.length > 0;
  if (!mapped) paths = FALLBACK_PATHS;
  const n = commitsSince(paths, date);
  const ageBehind = daysBetween(date, today);
  const stale = n > 0 && ageBehind >= DAYS;
  rows.push({ file: relative(ROOT, f), date, source, mapped, commitsSince: n, daysBehind: ageBehind, stale });
}
rows.sort((a, b) => b.commitsSince - a.commitsSince);
const staleRows = rows.filter((r) => r.stale);

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(staleRows.length > 0 ? 1 : 0);
}
if (QUIET && staleRows.length === 0) process.exit(0);

const lines = [];
if (staleRows.length === 0) {
  lines.push("✅ KB freshness: no doc lags its own cited code paths.");
} else {
  lines.push(`⚠️  KB freshness: ${staleRows.length} doc(s) predate changes to the code they cite (threshold ${DAYS}d). Code is ground truth — re-check & refresh:`);
  for (const d of staleRows.slice(0, 12)) {
    const tag = d.mapped ? "" : " [unmapped→repo-wide]";
    lines.push(`    • ${d.file}  (updated ${d.date}; ${d.commitsSince} commits to its cited code since)${tag}`);
  }
  if (staleRows.length > 12) lines.push(`    … and ${staleRows.length - 12} more`);
  lines.push("\n  After refreshing: bump _last_updated + add a dated 05-Logbook entry.");
}
console.log(lines.join("\n"));
process.exit(staleRows.length > 0 ? 1 : 0);
```

- [ ] **Step 5: Run the freshness script**

```bash
cd /Users/maulik/smaran
npm run kb:freshness
```
Expected: exits 0, prints `✅ KB freshness: no doc lags its own cited code paths.` (the docs were just written, so nothing is stale yet).

- [ ] **Step 6: Commit**

```bash
cd /Users/maulik/smaran
git add knowledgebase/ scripts/kb-freshness.mjs
git commit -m "docs: seed knowledgebase (index, architecture, logbook) + freshness script"
```

---

### Task 4: CLAUDE.md, symlinks, and `.agents/AGENTS.md`

**Files:**
- Create: `CLAUDE.md`
- Create (symlink): `GEMINI.md`
- Create (symlink): `AGENTS.md`
- Create: `.agents/AGENTS.md`

- [ ] **Step 1: Create `CLAUDE.md`**

`CLAUDE.md`:
```markdown
# Smaran — Repo Structure

This directory (`/Users/maulik/smaran`) is **two things in one git history**: the outer root
(docs, planning, this KB, and a standalone Playwright E2E suite) and `code/`, a **separate pnpm
workspace** holding the actual application (API server + two mockup apps). The outer root has
its own `package.json` — it is deliberately *not* part of `code/`'s pnpm workspace.

## Critical: Always specify which project a command targets

```bash
# Root E2E suite — run from repo root
npm run test:e2e

# code/ workspace — run from code/, or use pnpm --dir
pnpm --dir code run typecheck
pnpm --dir code --filter @workspace/api-server run dev
```

Running `npm`/`node` commands meant for `code/` from the outer root (or vice versa) will fail
or silently do the wrong thing — there are two separate `package.json`s and two separate
dependency trees.

## Product constraint — read before touching backend/WhatsApp code

The real product is **WhatsApp-only** — no consumer web UI, no marketplace, no payment gateway,
no webhook-driven payment state. Full detail (and why) lives in
`code/.agents/memory/smaran-product.md` — read it before adding backend/WhatsApp features so you
don't silently reintroduce something the blueprint explicitly forbids. The two React mockup apps
under `code/artifacts/` are internal preview surfaces, not the shipped UI.

## Running things

```bash
# Root E2E tests (API-level, against code/artifacts/api-server)
npm install
npm run test:e2e

# code/ workspace
pnpm --dir code install
pnpm --dir code run typecheck
pnpm --dir code run build
pnpm --dir code --filter @workspace/smaran run dev
pnpm --dir code --filter @workspace/mockup-sandbox run dev
```

---

# Knowledgebase (KB) — design/intent reference

`knowledgebase/` documents architecture and intent — folders `00-Meta` … `05-Logbook`, Obsidian-
style. Start at `knowledgebase/00-Meta/smaran-index.md`.

Use the KB to understand **why** something exists and how subsystems relate. It is **git-tracked**
(unlike some sibling projects' local-only KBs) — it's part of this repo's history.

## ⚠️ KB is manually synced — code is ground truth
The KB is updated by hand when features land, so it can lag the codebase.
- **When KB conflicts with code, trust the code.** Verify any load-bearing KB detail (route
  paths, env var names, file paths) against source before relying on it.
- **After adding/changing a feature**, update the relevant KB doc(s) + append a dated entry in
  `knowledgebase/05-Logbook/`, and bump the doc's `_last_updated` comment. This is part of "done."
- Run `npm run kb:freshness` to list KB docs whose cited code paths changed after the doc's
  `_last_updated` — a drift signal, not a verdict. A clean report means "no new drift," not
  "every doc is accurate" — still spot-check load-bearing claims when auditing.

---

# Agent rules

Short, project-specific do/don't rules live in `.agents/AGENTS.md` — read it. Longer-form
integration notes (API quirks, gotchas discovered while building) live in
`code/.agents/memory/` — start with `code/.agents/memory/smaran-product.md`.
```

- [ ] **Step 2: Create `.agents/AGENTS.md`**

`.agents/AGENTS.md`:
```markdown
# Smaran Agent Rules

## Styling and branding

- **Never hardcode a color** (`#fff`, `rgba(...)`) or use inline `style={{}}` in
  `code/artifacts/smaran/src` or `code/artifacts/mockup-sandbox/src` app code. Use a design
  token / Tailwind utility class instead. Enforced by ESLint (`code/eslint.config.mjs`) once
  `docs/superpowers/plans/2026-07-13-design-tokens-branding.md` has been executed — check that
  plan's status if the lint rule isn't firing yet.
- Exception: vendor shadcn primitives under `src/components/ui/**` in either app — those
  legitimately need inline styles for computed values (chart series colors, progress bar width).

## Product scope

- No marketplace, ratings, search, or discovery of priests/families — ever.
- No consumer web/app UI for the real product — WhatsApp is the interface.
- No payment gateway/PSP, no webhook-driven payment state.
- Full detail: `code/.agents/memory/smaran-product.md`.
```

- [ ] **Step 3: Create the symlinks**

```bash
cd /Users/maulik/smaran
ln -s CLAUDE.md GEMINI.md
ln -s CLAUDE.md AGENTS.md
```

- [ ] **Step 4: Verify**

```bash
cd /Users/maulik/smaran
ls -la CLAUDE.md GEMINI.md AGENTS.md
diff <(cat GEMINI.md) <(cat CLAUDE.md)
diff <(cat AGENTS.md) <(cat CLAUDE.md)
```
Expected: `ls -la` shows `GEMINI.md -> CLAUDE.md` and `AGENTS.md -> CLAUDE.md`; both `diff`s print nothing (identical content via the symlink).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add CLAUDE.md GEMINI.md AGENTS.md .agents/AGENTS.md
git commit -m "docs: add root CLAUDE.md, GEMINI.md/AGENTS.md symlinks, and agent rules"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Re-run the E2E suite from a clean state**

```bash
cd /Users/maulik/smaran
npm run test:e2e
```
Expected: all 6 tests PASS.

- [ ] **Step 2: Re-run the freshness check**

```bash
cd /Users/maulik/smaran
npm run kb:freshness
```
Expected: exits 0, no stale docs.

- [ ] **Step 3: Confirm the symlinks resolve from a fresh shell**

```bash
cd /Users/maulik/smaran
head -5 GEMINI.md
head -5 AGENTS.md
```
Expected: both print the same `# Smaran — Repo Structure` heading as `CLAUDE.md`.

- [ ] **Step 4: Confirm `code/`'s own workspace still builds clean (no regressions)**

```bash
cd /Users/maulik/smaran
pnpm --dir code run typecheck
```
Expected: succeeds with no errors.

No commit for this task — verification only, no file changes expected.
