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
