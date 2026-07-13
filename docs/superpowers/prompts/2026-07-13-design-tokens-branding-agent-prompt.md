# Agent Prompt — Design Tokens & Branding Standardization

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

Spec:  docs/superpowers/specs/2026-07-13-design-tokens-branding-design.md
Plan:  docs/superpowers/plans/2026-07-13-design-tokens-branding.md
Project constraints, repo layout, and working rules:
/Users/maulik/smaran/CLAUDE.md

REQUIRED SUB-SKILL (per the plan's own header): use superpowers:subagent-driven-development
(recommended) or superpowers:executing-plans to run this task-by-task.

Execute the plan task by task. Each task ends with a commit and an independently
verifiable deliverable. Do not skip ahead, do not batch tasks, do not improvise work
the plan does not ask for.

## Goal
Give the two Tailwind v4 mockup apps (`smaran`, `mockup-sandbox`) one shared,
brand-correct token source instead of duplicated/drifted CSS — a new
`lib/design-tokens` package holding the canonical sandalwood/marigold/temple-brass
theme (Fraunces + DM Sans), consumed by both apps via Tailwind v4 CSS-first
`@theme`/`@import` — plus a guidance README and an ESLint rule so future screens
can't hardcode off-brand colors or inline styles. `mockup-sandbox` goes from
generic unbranded shadcn defaults to Smaran's actual brand as part of this.
```

## Repository topology

```
ONE git repository, but TWO independent projects inside it:

- /Users/maulik/smaran — the outer root: docs/, .planning/, knowledgebase/, and a
  standalone npm project for the Playwright E2E suite (tests/api/). NOT part of the
  pnpm workspace below.
- /Users/maulik/smaran/code — a SEPARATE pnpm workspace (own package.json,
  pnpm-workspace.yaml): artifacts/{api-server,smaran,mockup-sandbox}, lib/*.

Running an `npm` command meant for the root from inside `code/`, or a `pnpm` command
meant for `code/` from the root, fails or silently no-ops. Use `pnpm --dir code <cmd>`
from the root rather than `cd`-ing, where practical.

This task touches ONLY `code/` — every file in every task (1 through 6) lives under
`code/lib/design-tokens`, `code/artifacts/smaran`, `code/artifacts/mockup-sandbox`,
`code/eslint.config.mjs`, `code/package.json`, or `code/pnpm-workspace.yaml`. Nothing
in this plan touches the outer root (docs/, .planning/, tests/api/). If you find
yourself editing anything outside `code/`, stop — that's not in scope for this plan.
```

## Working directories

```
Your shell's working directory PERSISTS BETWEEN COMMANDS. A stray `cd` into `code/`
(or out of it) will make a filtered pnpm command resolve against the wrong package.
Start every command with an explicit path — prefer `pnpm --dir code --filter <pkg>
run <script>` from the root over `cd`-ing into `code/` first, so cwd state can't
silently carry into the next command. (The plan's own steps write commands as
`cd /Users/maulik/smaran/code && pnpm ...` — that's fine too, just don't let a `cd`
from one step leak into a step that assumes a different cwd.)
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
This plan touches no database. `code/lib/db` (Drizzle ORM) is unrelated to design
tokens/branding and should not be touched by this agent.
```

## Secrets (verbatim, always)

```
Never print, echo, cat, or grep a secret value into your output. This task involves
no secrets, no env vars, and no credentials — it is CSS, package.json, and ESLint
config only. If any step you're about to run seems to require a secret, stop — that
means you've drifted from the plan.
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
- Do not change any brand token VALUE (color/font/radius) — this plan moves values
  verbatim. The ONE exception is explicitly named in Task 5: the pre-existing hardcoded
  `style={{ color: "red", ... }}` in `mockup-sandbox/src/App.tsx:79`, which gets replaced
  with `text-destructive` — do not treat this as license to touch any other value.
```

## Fan-in check

```
`code/lib/design-tokens` becomes a single source of truth consumed by BOTH
`artifacts/smaran` AND `artifacts/mockup-sandbox` — this plan is itself the fan-in
event (today's duplicated, independently-drifting per-app tokens become one shared
package). Once Task 1-3 land, renaming or removing a CSS custom property in
`tokens.css` is a fan-in change across both apps' Tailwind utility usage (`bg-primary`,
`text-foreground`, etc.) — grep both apps' `src/` before assuming a later tokens.css
edit is contained to one file. Within THIS plan, though, no renames happen: Task 1
moves smaran's existing property names verbatim, so there is nothing to reconcile yet.

(This project has no Prisma schema / shared graph ids — `code/lib/api-zod` is the
closest other fan-in point in the repo generally, but it is unrelated to this task.)
```

## Scope boundaries

```
Copied verbatim from the spec's own Non-goals section:

- No shipped web UI — this does not create or imply a new product surface.
- No card-image rendering pipeline is being built now — only keeping the token format
  compatible with one later (plain CSS custom properties, no JS/TS token codegen).
- No JS/TS token codegen (style-dictionary-style) — deferred unless a non-browser
  renderer (e.g. Satori, which needs raw JS values) is actually chosen later.
- No git-hook wiring for lint — the `lint` script is runnable manually/in CI only,
  not enforced pre-commit.

No drive-by refactors, no reformatting, no dependency changes beyond eslint/
typescript-eslint (Task 4), no renames beyond what the task explicitly names.
```

## Verification discipline (verbatim, always)

```
- Never claim a test/command passes without pasting its actual output.
- This plan is deliberately TDD-shaped for the lint rule: Task 5 Step 1-2 requires
  introducing a probe violation and confirming lint FAILS on it for the stated reason
  (two no-restricted-syntax errors) BEFORE removing the probe and confirming clean.
  If lint passes with the probe still in place, the rule isn't wired correctly —
  stop and report, don't proceed to remove the probe.
- A mocked boundary cannot enforce the contract on the other side of it. Task 2/3's
  "verify resolved CSS is unchanged" step greps the actual BUILT dist output for the
  literal HSL value, not just that the import statement exists in source — do that
  grep, don't skip it because the import "looks right."
- Delete every temporary/scratch file before committing — Task 5 Step 1's probe line
  in `smaran/src/App.tsx` is explicitly temporary and must be removed (verified by
  `grep -c "__lintProbe"` returning `0`) before that task's commit.
```

## Reporting (verbatim, always)

```
After each task: what changed, the VERBATIM output of the verification command, the
commit SHA. If expected output doesn't match observation — especially the lint probe
in Task 5 not failing when it should — STOP and report the discrepancy. Do not proceed
hoping it resolves.

At Task 6 (final task, verification only, no commit expected): run every command it
names (typecheck, build, both apps' lint, both apps' dev server visual check), report
results, and STOP. Do not begin follow-up work the plan didn't ask for — in particular,
do not activate dark mode (tokens exist but are deliberately inert per the plan) and
do not start building the card-image rendering pipeline referenced in the spec's
Non-goals.
```

---

## Task list at a glance (6 tasks, all under `code/`)

```
1. Scaffold code/lib/design-tokens (package.json, fonts.css, tokens.css, README.md) — commit
2. Migrate smaran to consume it — commit
3. Migrate mockup-sandbox to consume it (this brands it for the first time) — commit
4. Add eslint + typescript-eslint to catalog, root flat config, lint scripts — commit
5. Prove the lint rule fires (probe → fail → remove probe → pass), fix mockup-sandbox's
   one real pre-existing violation (App.tsx:79) — commit
6. Full workspace verification (typecheck, build, both apps' lint, visual spot-check) — no commit
```

---

## Traps specific to this task

- `code/pnpm-workspace.yaml`'s `overrides` block strips non-Linux native binaries — a
  bare `vite dev`/`vite build` for `smaran` or `mockup-sandbox` can fail on macOS with
  a missing `@rollup/rollup-darwin-*` binary. Not yet resolved as of this writing —
  don't assume a failed `vite dev` in Task 6's visual spot-check means the token
  refactor itself is broken; typecheck/build via the workspace scripts are the more
  reliable signal.
- Root `code/package.json` has no `"type": "module"` — the ESLint config file MUST be
  named `eslint.config.mjs` (explicit ESM extension), not `.js`, or Node will try to
  parse it as CommonJS and fail.
- `pnpm` only creates a `node_modules/.bin/eslint` symlink for packages that declare
  `eslint` as their OWN dependency — adding it to root `devDependencies` alone is not
  enough for `pnpm --filter @workspace/smaran run lint` to find the binary; it must
  also be a devDependency of each app (Task 4 Step 3 already accounts for this — don't
  skip it as redundant).
</content>
