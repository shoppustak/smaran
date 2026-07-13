# Agent Prompt — Reusable Preamble

Boilerplate for every external-agent prompt in this repo. Adapted from
`/Users/maulik/streethawk/docs/superpowers/AGENT-PROMPT-TEMPLATE.md` (a sibling project's
template, itself distilled from real incidents there) — this version is scoped to Smaran's
actual topology and constraints, not copied verbatim. Copy the sections below into a new
prompt, fill the `[FILL IN]` slots, keep the rest verbatim — these are load-bearing, not
filler. Do not silently drop a section because "this task doesn't need it"; if it genuinely
doesn't apply, say so explicitly in the prompt rather than deleting it, so the next person
editing this template knows it was a decision, not an oversight.

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
You are implementing a written plan[ against an approved design spec]. Read [it/them]
in full before touching anything:

[Spec path, if any — e.g. docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md]
[Plan path — required — e.g. docs/superpowers/plans/YYYY-MM-DD-<topic>.md]
Project constraints, repo layout, and working rules:
/Users/maulik/smaran/CLAUDE.md

Execute the plan task by task. Each task ends with a commit and an independently
verifiable deliverable. Do not skip ahead, do not batch tasks, do not improvise work
the plan does not ask for.

## Goal
[One paragraph: what this delivers, in the task's own vocabulary]
```

## Repository topology

```
ONE git repository, but TWO independent projects inside it — this is the Smaran-specific
trap (streethawk's equivalent problem is two separate nested git repos; ours is one repo,
two package managers):

- /Users/maulik/smaran — the outer root: docs/, .planning/, knowledgebase/, and a standalone
  npm project (root package.json) for the Playwright E2E suite (tests/api/). NOT part of the
  pnpm workspace below.
- /Users/maulik/smaran/code — a SEPARATE pnpm workspace (own package.json,
  pnpm-workspace.yaml): artifacts/{api-server,smaran,mockup-sandbox}, lib/*.

Running an `npm` command meant for the root from inside `code/`, or a `pnpm` command meant
for `code/` from the root, fails or silently no-ops. Use `pnpm --dir code <cmd>` from the
root rather than `cd`-ing, where practical — it's one fewer state to lose track of.

[State which tasks touch code/ vs the root, explicitly, by number.]
```

## Working directories

```
Your shell's working directory PERSISTS BETWEEN COMMANDS. A stray `cd` into `code/` (or
out of it) will make `npm run test:e2e` report nothing runnable, or make `pnpm --filter
@workspace/smaran ...` fail to resolve. Start every command with an explicit path — prefer
`pnpm --dir code --filter <pkg> run <script>` from the root over `cd`-ing into `code/`
first, so cwd state can't silently carry into the next command.
```

## Branch-state check — run before the FIRST command, not just before a migration

```
Before doing anything else:
  git status
  git rev-parse --abbrev-ref HEAD

If the second command prints "HEAD" instead of a branch name, the repo is in a
DETACHED HEAD state. STOP. Do not commit. Do not check out anything. Report it and wait.
Committing on top of a detached HEAD orphans the work the moment anyone checks out a branch.

If `git status` shows uncommitted changes you did not make and the task doesn't name them,
they are someone else's in-flight work (this has happened in this repo — mid-session
handoffs are normal here). Do not stash, commit, or `git checkout --` them. Leave them
exactly as found.
```

## Database — not yet applicable, keep this section rather than deleting it

```
`code/lib/db` (Drizzle ORM) exists but its schema is not yet populated — there is no live
database connection, no DATABASE_URL, and no migration to run as of this writing. When
Postgres/Drizzle lands (see .planning/ROADMAP.md Phase 1 — Platform Foundation), apply the
same discipline streethawk's template encodes: before any `drizzle-kit push`/migrate or
destructive query, print and confirm the target host is not production before proceeding.
Update this section with the real check once a DATABASE_URL env var actually exists.
```

## Secrets (verbatim, always)

```
Never print, echo, cat, or grep a secret value into your output. Read env vars via
process.env inside a script and use them; to confirm one exists, print a boolean:
console.log('present:', !!process.env.X). Never commit a real .env file (none exists in
this repo as of this writing — if you add one, it must be gitignored immediately).

Current real secrets this project touches: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
WHATSAPP_VERIFY_TOKEN (Meta Cloud API — see code/artifacts/api-server/src/routes/whatsapp.ts),
VEDIKA_API_KEY (Panchang API — sandbox works with no key at all; only set this to test the
production tier). None are required for the E2E suite (tests/api/) — it deliberately tests
the no-credentials code paths (502 "not configured", webhook verify with a throwaway token).
```

## What you may not do

```
- Do not push to origin/main without explicit confirmation. Commit locally; the human
  decides when to push/deploy.
- Do not git push --force, ever.
- Never run git checkout -- or git restore on a file with uncommitted changes you didn't
  create — it may be in-flight work that exists nowhere else.
- git add -A / git add . is forbidden. Every commit stages only the paths its own task
  names — review `git status` after any broad add before committing.
```

## Fan-in check — the closest present-day analog to streethawk's shared-graph-id trap

```
This project has no Prisma schema / shared graph ids yet (streethawk's version of this
section is about a Postgres schema this project doesn't have). The closest real analog
today: `code/lib/api-zod` is the single source of truth for request/response shapes,
consumed by BOTH `code/artifacts/api-server` (routes validate against it) AND
`code/lib/api-client-react` (generates React Query hooks from it) AND, transitively, any
UI component calling those hooks. Renaming or restructuring a field in an api-zod schema
is a fan-in change: grep both consumers (routes + generated hooks + any component
destructuring the response) before assuming a schema edit is contained to one file.
```

## Scope boundaries

```
[List what's deliberately NOT in this task, from the plan's own "Non-goals" section. Copy
it verbatim — don't paraphrase, the plan already stated the reasoning.] No drive-by
refactors, no reformatting, no dependency changes, no renames beyond what the task
explicitly names.
```

## Verification discipline (verbatim, always)

```
- Never claim a test/command passes without pasting its actual output.
- TDD where the plan says so: write the test, run it, confirm it fails for the STATED
  reason, then implement. A test that passes before the fix means the bug is already
  fixed or the test is wrong — stop and report, don't proceed either way.
- A mocked boundary cannot enforce the contract on the other side of it. When a task's
  contract crosses a boundary (client↔server, component↔call-site, code↔schema), verify it
  against the REAL other side — a running server, the actual parent component — not just a
  mock. (Example already proven in this repo: the E2E suite in tests/api/ deliberately hits
  a real booted api-server, not a mocked one, for exactly this reason.)
- Delete every temporary/scratch file before committing.
```

## Reporting (verbatim, always)

```
After each task: what changed, the VERBATIM output of the verification command, the commit
SHA. If expected output doesn't match observation — especially a test passing when the plan
says it must fail — STOP and report the discrepancy. Do not proceed hoping it resolves.

At the final task: run every suite the plan names, report results, and STOP. Do not begin
follow-up work the plan didn't ask for, even if it seems like the obvious next step.
```

---

## Traps log — append here as new ones are found; prune only if the underlying code fix
## makes a trap structurally impossible (say so when you prune, don't just delete)

- **macOS local dev**: `code/pnpm-workspace.yaml`'s `overrides` block deliberately strips
  non-Linux native binaries (esbuild, rollup, lightningcss, etc. — Replit's production
  target is `linux-x64`). First `pnpm --dir code install` on macOS hits
  `[ERR_PNPM_IGNORED_BUILDS]` for esbuild — run `pnpm --dir code approve-builds --all` once
  (already done for this repo, see commit `28fde03`). Rollup is worse: it has no postinstall
  self-heal like esbuild does, so `vite dev`/`vite build` for `artifacts/smaran` or
  `artifacts/mockup-sandbox` can fail outright on macOS with a missing
  `@rollup/rollup-darwin-*` native binary. Not yet resolved as of this writing — expect it,
  don't assume a failed `vite dev` means your code change is broken.
- `code/artifacts/api-server` requires `PORT` to be set — the process throws and exits
  immediately if it's unset. Always pass it explicitly when booting the server manually.
- Vedika's sandbox Panchang endpoint (`GET /api/panchang` with no `VEDIKA_API_KEY`) **always
  returns the same fixed mock payload** regardless of the requested date/lat/long — it
  proves API shape, not real computation. Don't write a test or feature that assumes the
  sandbox response varies with input.
- Meta's WhatsApp test-mode webhook requires TWO separate steps in the dashboard: entering
  the callback URL + verify token, AND separately clicking "Subscribe" on the "messages"
  field. Step 1 alone registers the URL but delivers zero webhook calls.
- `git log -S "<string>"` shows commits where the *count* of that string changed. One
  matching commit means it was ADDED there — it does not mean it was later removed. Verify
  claims about `main` against `main` (`git show origin/main:<path>`), not the working tree.
