# Agent Prompt — Knowledgebase, Root E2E Testing, and Agent Guardrails Setup

Built from `docs/superpowers/AGENT-PROMPT-TEMPLATE.md`. Copy everything below into the
agent's first message verbatim.

---

## Platform note — Gemini / Antigravity delegation

```
If you are running as Antigravity's `agy`: you have no todo tool. `manage_task`
controls background processes only — it is not a checklist. Treat THIS PLAN
DOCUMENT'S OWN checkboxes as your task artifact: edit it in place (mark each
`- [ ]` as `- [x]`) as you complete steps, and re-read it before starting the next
one if the conversation has grown long. Do not look for or invent a separate todo
tool.
```

---

## Header block

```
You are implementing a written plan against an approved design spec. Read both
in full before touching anything:

Spec:  docs/superpowers/specs/2026-07-13-kb-e2e-agent-setup-design.md
Plan:  docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md
Project constraints, repo layout, and working rules: this plan IS what creates
CLAUDE.md — until Task 4 lands there is no root CLAUDE.md yet. Read
`code/.agents/memory/smaran-product.md` instead for the product's negative
constraints (WhatsApp-only, no web UI) before writing anything that touches
backend/WhatsApp routes.

REQUIRED SUB-SKILL (per the plan's own header): use superpowers:subagent-driven-development
(recommended) or superpowers:executing-plans to run this task-by-task.

Execute the plan task by task. Each task ends with a commit and an independently
verifiable deliverable. Do not skip ahead, do not batch tasks, do not improvise work
the plan does not ask for.

## Goal
Stand up three practices adopted from `/Users/maulik/streethawk` at the Smaran repo
root: a standalone npm project with a root-level Playwright E2E suite that boots
`code/artifacts/api-server` and tests its real HTTP routes (health, panchang,
whatsapp) with no browser; a git-tracked `knowledgebase/` seeded with exactly what
exists in code today (not the unbuilt 7-phase roadmap); and `CLAUDE.md` (with
`GEMINI.md`/`AGENTS.md` as symlinks to it) plus a short `.agents/AGENTS.md`
guardrails file. This creates a SECOND, independent project root — do not confuse
it with `code/`'s pnpm workspace.
```

## Repository topology

```
ONE git repository, but TWO independent projects inside it — and this plan is what
CREATES one side of that split, not just works within an existing one:

- /Users/maulik/smaran — the outer root. Before this plan runs, it holds only docs/,
  .planning/, knowledgebase-adjacent design docs. Tasks 1-4 ADD a standalone npm
  project here: package.json, tsconfig.json, playwright.config.ts, tests/api/,
  knowledgebase/, scripts/kb-freshness.mjs, CLAUDE.md (+ GEMINI.md/AGENTS.md
  symlinks), .agents/AGENTS.md.
- /Users/maulik/smaran/code — the PRE-EXISTING, separate pnpm workspace (own
  package.json, pnpm-workspace.yaml): artifacts/{api-server,smaran,mockup-sandbox},
  lib/*. This plan does not add files here — it only READS from and BOOTS
  `code/artifacts/api-server` (via Playwright's webServer option) as the thing under
  test.

The root project you're creating uses npm, not pnpm, and has NO catalog: references
— don't reach for pnpm-workspace patterns when editing the root package.json.
Running an `npm` command meant for the root from inside `code/`, or a `pnpm` command
meant for `code/` from the root, fails or silently no-ops.
```

## Working directories

```
Your shell's working directory PERSISTS BETWEEN COMMANDS. Every step in this plan is
written as `cd /Users/maulik/smaran && <cmd>` or `cd /Users/maulik/smaran/code && <cmd>`
explicitly — follow that literally rather than chaining a bare `cd code` once and
reusing it, since a later root-level step (e.g. `npm run test:e2e`, `git add`) would
silently run from the wrong directory otherwise. Task 2 Step 2 backgrounds a process
(`node ... &` then `kill %1`) — that job-control state is also shell-session-specific;
don't let it leak into unrelated later commands.
```

## Branch-state check — run before the FIRST command, not just before a migration

```
Before doing anything else:
  git status
  git rev-parse --abbrev-ref HEAD

If the second command prints "HEAD" instead of a branch name, the repo is in a
DETACHED HEAD state. STOP. Do not commit. Do not check out anything. Report it and wait.

If `git status` shows uncommitted changes you did not make and the task doesn't name
them, they are someone else's in-flight work. Do not stash, commit, or `git checkout --`
them. Leave them exactly as found.
```

## Database — not applicable to this task, keep this section rather than deleting it

```
`code/lib/db` (Drizzle ORM) exists but its schema is not yet populated — no
DATABASE_URL, no migration. This plan doesn't touch it. If a future run of this
prompt inherits a real DATABASE_URL, that's out of scope here regardless — this
plan's E2E tests hit api-server's stateless/in-memory routes only (panchang sandbox,
WhatsApp's in-memory ring buffer), no database round-trip.
```

## Secrets (verbatim, always)

```
Never print, echo, cat, or grep a secret value into your output. Read env vars via
process.env inside a script and use them; to confirm one exists, print a boolean:
console.log('present:', !!process.env.X). Never commit a real .env file.

This plan's own tests deliberately use a THROWAWAY value, not a real secret:
`WHATSAPP_VERIFY_TOKEN: "e2e-test-verify-token"`, set only in `playwright.config.ts`'s
`webServer.env` for the test process. This is fine to write literally into
`playwright.config.ts` and commit — it is a test fixture value, not a credential
(the real `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_VERIFY_TOKEN`
used in production are never referenced by this plan and must never appear in a
committed file).
```

## What you may not do

```
- Do not push to origin/main without explicit confirmation. Commit locally; the human
  decides when to push/deploy.
- Do not git push --force, ever.
- Never run git checkout -- or git restore on a file with uncommitted changes you didn't
  create — it may be in-flight work that exists nowhere else.
- git add -A / git add . is forbidden. Every commit stages only the paths its own task
  names (each task in the plan lists its exact `git add` targets) — review `git status`
  after any add before committing.
- Do not write KB content for `.planning/ROADMAP.md` phases 1-7 — they aren't built.
  The KB documents what exists in code TODAY only (spec's explicit non-goal).
- Do not add a `.gitignore` entry hiding `knowledgebase/` — unlike streethawk's
  local-only KB, this one is deliberately git-tracked (approved design decision).
```

## Fan-in check

```
No shared schema/graph-id fan-in risk in this plan — Tasks 1-4 create net-new files
at the root; nothing here edits a file consumed by multiple other packages. The one
thing to get right instead: `CLAUDE.md`'s content (Task 4) and `.agents/AGENTS.md`'s
content both reference the design-tokens ESLint rule from
`docs/superpowers/plans/2026-07-13-design-tokens-branding.md` — if that plan has
ALREADY been executed by the time you run this one, `code/eslint.config.mjs` exists
and the rule is live; if not, it's still a forward reference. Either way, write the
sentence in the plan exactly as given ("check that plan's status if the lint rule
isn't firing yet") — don't strengthen or weaken the claim based on what you find,
since this task's job is the KB/E2E/guardrails scaffold, not auditing the other plan.
```

## Scope boundaries

```
Copied verbatim from the spec's own Non-goals section:

- No UI/browser E2E in this pass — the product is WhatsApp-only (locked constraint);
  the two mockup apps are prototypes, not the tested surface. API-level Playwright
  tests against `api-server` are the real product surface.
- No documentation of ROADMAP.md phases 1-7 in the KB — those aren't built yet and
  already live in `.planning/`. The KB documents what exists in code today.
- No CI wiring for the new `test:e2e` script — runnable manually/later, not blocking
  this setup.
- No git hook for KB freshness — the freshness script is added as tooling; hook
  wiring is a follow-up, not part of this plan.

No drive-by refactors, no reformatting, no dependency changes beyond what Task 1
names (`@playwright/test`, `@types/node`, `typescript`), no renames.
```

## Verification discipline (verbatim, always)

```
- Never claim a test/command passes without pasting its actual output.
- Task 2 Step 2 is a manual boot-and-curl check BEFORE the Playwright config exists —
  run it and confirm the literal `{"status":"ok"}` output before writing
  `playwright.config.ts`. If it doesn't print that, do not proceed to write tests
  against a server you haven't confirmed boots.
- A mocked boundary cannot enforce the contract on the other side of it. This is why
  every test in Task 2 hits a REAL booted `api-server` via Playwright's `webServer`
  option, not a mocked HTTP layer — keep it that way; do not refactor to a mock server
  even if it would make the suite start faster.
- Task 3 Step 5's freshness-script run and Task 5 Step 2's re-run both need a clean
  `exit 0` with the "no doc lags" message — if either prints a stale warning, the KB
  docs you just wrote already cite paths with commits after today's date, which
  shouldn't be possible from a fresh write; stop and investigate rather than
  suppressing with `--quiet`.
- Delete every temporary/scratch file before committing — Task 2 Step 2's backgrounded
  `node` process must be killed (`kill %1`) before moving on; don't leave it running
  past that step.
```

## Reporting (verbatim, always)

```
After each task: what changed, the VERBATIM output of the verification command, the
commit SHA. If expected output doesn't match observation — especially Task 2 Step 7
expecting exactly 6 passing tests (1 health + 1 panchang + 4 whatsapp) — STOP and
report the discrepancy. Do not proceed hoping it resolves.

At Task 5 (final task, verification only, no commit expected): run every command it
names (E2E suite re-run, freshness re-run, symlink resolution check, code/ typecheck),
report results, and STOP. Do not begin follow-up work the plan didn't ask for — in
particular, do not wire a PostToolUse hook or `/kb-audit` slash command (explicitly
deferred in the spec's non-goals), and do not start writing KB docs for
`.planning/ROADMAP.md`'s unbuilt phases.
```

---

## Task list at a glance (5 tasks — Tasks 1-4 touch only the outer root, never `code/`)

```
1. Scaffold root npm project (package.json, tsconfig.json) — commit
2. Playwright config + 3 API E2E spec files (health, panchang, whatsapp) — commit
3. Knowledgebase scaffold (index, architecture doc, logbook entry) + kb-freshness.mjs — commit
4. CLAUDE.md + GEMINI.md/AGENTS.md symlinks + .agents/AGENTS.md — commit
5. Full verification (E2E re-run, freshness re-run, symlink check, code/ typecheck) — no commit
```

---

## Traps specific to this task

- First-time `pnpm install` inside `code/` on macOS can hit
  `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.27.3` — the workspace's
  `overrides` block strips non-Linux native binaries (production targets `linux-x64`).
  This was already fixed once (`code/pnpm-workspace.yaml` commit `28fde03` added
  `allowBuilds: { esbuild: true }`) — a fresh install from that commit onward shouldn't
  hit it, but if a lockfile change reintroduces it, run
  `pnpm --dir code approve-builds --all` (Task 2 Step 1 already accounts for this).
- `code/artifacts/api-server` throws and exits immediately if `PORT` is unset — always
  pass it explicitly (both the manual curl check in Task 2 Step 2 and
  `playwright.config.ts`'s `webServer.env` already do this; don't drop it if you
  rewrite either).
- Vedika's sandbox Panchang endpoint always returns the SAME fixed mock payload
  regardless of requested date/lat/long — this is why `panchang.spec.ts` asserts
  types/shape (`typeof body.tithi.name === "string"`), not exact values. Don't
  "strengthen" the test by asserting a specific date or tithi value; the sandbox
  fixture proves API shape, not real computation.
- Two `package.json` files, two `node_modules` trees, two lockfiles now exist in this
  repo after Task 1 (root `package-lock.json` vs `code/pnpm-lock.yaml`) — an `npm
  install` run from inside `code/` (wrong tool for that directory) or a `pnpm install`
  run from the root (wrong tool up here) will not error loudly in every case; always
  double check which directory a dependency command is running from.
</content>
