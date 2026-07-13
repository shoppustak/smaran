# Agent Prompt — Staging & Production Infrastructure

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

Spec:  docs/superpowers/specs/2026-07-13-staging-prod-infra-design.md
Plan:  docs/superpowers/plans/2026-07-13-staging-prod-infra.md
Project constraints, repo layout, and working rules:
/Users/maulik/smaran/CLAUDE.md (if it doesn't exist yet, that means
docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md hasn't been executed —
see the Prerequisite section below before assuming this plan is unblocked)

REQUIRED SUB-SKILL (per the plan's own header): use superpowers:subagent-driven-development
(recommended) or superpowers:executing-plans to run this task-by-task.

Execute the plan task by task. Each task ends with a commit and an independently
verifiable deliverable, EXCEPT Tasks 6 and 7, which are human-only checklists you
cannot execute yourself (see below) — do not attempt to simulate, skip silently,
or "do your best" on those; stop and hand them to the human.

## Goal
Stand up a $0/month production deployment for `code/artifacts/api-server` on Render
+ Supabase, using minibag's proven always-warm-via-external-pinger pattern
(`GET /api/keepalive`, always HTTP 200 regardless of DB state, pinged every 5
minutes by cron-job.org), with `api.smaran.click` as the production URL via a
`render.yaml` at the repo root. There is deliberately NO persistent staging host —
local dev covers that, for the same free-tier 750-instance-hour/month budget
reason minibag itself avoided a second always-warm Render service.
```

## Prerequisite — this plan depends on another plan's output

```
Tasks 5 and 8 depend on files created by
docs/superpowers/plans/2026-07-13-kb-e2e-agent-setup.md:
  - Task 5 needs playwright.config.ts and tests/api/health.spec.ts to already exist.
  - Task 8 needs knowledgebase/01-Architecture/smaran-platform-architecture.md to
    already exist.

Both tasks' own Step 1 is a literal shell check for this (`test -f ...`). Run that
check when you reach each task — do not assume the prerequisite plan's state from
memory or from what's in this conversation; check the filesystem at the time you
reach that task, since the two plans may run in either order or be interleaved
across sessions. If the check prints STOP, skip that task and come back to it
later — do not fail the whole plan over it, and do not improvise the missing file
yourself (it belongs to the other plan, not this one).
```

## Repository topology

```
ONE git repository, two independent projects. This plan's own files land in BOTH:

- /Users/maulik/smaran (outer root): render.yaml (Task 4), tests/api/keepalive.spec.ts
  (Task 5, prerequisite-gated), knowledgebase/01-Architecture/smaran-platform-architecture.md
  edit (Task 8, prerequisite-gated).
- /Users/maulik/smaran/code (pnpm workspace): .env.example, openapi.yaml, the new
  keepalive.ts route, routes/index.ts (Tasks 1-3).

Task 2's codegen (`pnpm --dir code --filter @workspace/api-spec run codegen`) writes
generated output into TWO other packages you don't hand-edit —
`code/lib/api-zod/src/generated/` and `code/lib/api-client-react/src/generated/` —
commit those generated changes alongside the `openapi.yaml` source edit (Task 2 Step
4's `git add` already includes both directories; don't narrow it to just the yaml).
```

## Working directories

```
Your shell's working directory PERSISTS BETWEEN COMMANDS. Task 3 Steps 4-5 background
a `node` process, write its PID to a /tmp file, curl it, then kill it by reading that
PID back — follow the plan's exact commands (including the `rm -f` cleanup) rather
than improvising a shorter background+curl+kill sequence, since a leaked background
process on port 4301/4302 will make the NEXT verification step's `node ... &` silently
bind a different port or fail confusingly. Every command in this plan is written with
an explicit `cd /Users/maulik/smaran && ...` or `cd /Users/maulik/smaran/code && ...` —
follow that literally.
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

## Database — now directly load-bearing for this plan, read carefully

```
`@workspace/db` (code/lib/db/src/index.ts:8-10) throws AT IMPORT TIME if DATABASE_URL
is unset. DATABASE_URL is not set anywhere in this repo as of this writing — no .env
file exists, nothing currently imports @workspace/db. This is exactly why Task 3's
keepalive route uses a DYNAMIC `await import("@workspace/db")` gated behind
`if (process.env.DATABASE_URL)`, never a static top-level import. If you find
yourself refactoring that route, do not change this to a static import — it would
crash the ENTIRE server on every boot until a real database is wired up (ROADMAP
Phase 1, not yet started).

Task 3 Steps 4-5 explicitly verify both states live: no DATABASE_URL (expect
database: "not_configured", still HTTP 200) and an UNREACHABLE DATABASE_URL (expect
database: "cold", STILL HTTP 200, never a non-200). The second case is the actual
load-bearing behavior the whole external-pinger design depends on — a real DB outage
must never make cron-job.org see a failure, or it auto-disables the job (this is the
literal incident minibag hit that this design is ported from). Do not weaken this to
"return 503 if DB check fails" even if it feels more semantically correct — that is
the bug being deliberately avoided.

Before any future `drizzle-kit push`/migrate or destructive query once a real
DATABASE_URL exists: print and confirm the target host is not production before
proceeding (per the repo-wide template's Database discipline). Not applicable to any
step IN this plan — noted so you don't improvise a migration this plan doesn't ask
for.
```

## Secrets (verbatim, always)

```
Never print, echo, cat, or grep a secret value into your output. Read env vars via
process.env inside a script and use them; to confirm one exists, print a boolean:
console.log('present:', !!process.env.X). Never commit a real .env file — Task 1
creates `.env.example` with every value blank/placeholder, never a real credential.

`render.yaml` (Task 4) declares DATABASE_URL, WHATSAPP_ACCESS_TOKEN,
WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, and VEDIKA_API_KEY all with
`sync: false` — this means Render will NOT read them from the yaml file (which is
committed) but requires them entered manually in Render's dashboard (Task 6 Step 2,
human-only). Do not put a real value for any of these into render.yaml or any
committed file, ever, under any circumstance — `sync: false` is the whole point.

Task 3 Step 5's test DATABASE_URL (`postgres://user:pass@localhost:1/nonexistent`) is
a deliberately-unreachable placeholder for testing the "cold" path, not a real
credential — fine to run/commit as-is in the verification command (it's not
persisted anywhere, just used transiently in that one curl test).
```

## What you may not do

```
- Do not push to origin/main without explicit confirmation. Commit locally; the human
  decides when to push/deploy.
- Do not git push --force, ever.
- Never run git checkout -- or git restore on a file with uncommitted changes you didn't
  create — it may be in-flight work that exists nowhere else.
- git add -A / git add . is forbidden. Every commit stages only the paths its own task
  names — review `git status` after any add before committing.
- Never hand-edit files under `code/lib/api-zod/src/generated/` or
  `code/lib/api-client-react/src/generated/` — edit `code/lib/api-spec/openapi.yaml`
  and run `orval` codegen (Task 2 Step 2) instead. This is a fan-in surface, not a
  place for one-off fixes.
- Do not create Render/Supabase/cron-job.org accounts, click through their dashboards,
  or edit DNS records yourself — you cannot authenticate as the human's account and
  should not attempt to. Tasks 6-7 are checklists FOR THE HUMAN, not tasks to execute.
```

## Fan-in check

```
`code/lib/api-zod`'s schemas (Task 2) are the single source of truth for
request/response shapes, consumed by BOTH `code/artifacts/api-server` (routes
validate against it, Task 3) AND `code/lib/api-client-react` (generates React Query
hooks from it) AND, transitively, any UI component calling those hooks. Adding
`KeepaliveStatus`/`KeepaliveResponse` is additive (a new schema, not a change to an
existing one), so this plan's own edit is low-risk — but it still runs through the
same codegen pipeline as any other schema change, and the codegen output touches
files in a package this plan doesn't otherwise modify (`api-client-react`). Don't
narrow the Task 2 Step 4 commit to skip that generated output just because "this
plan doesn't use react-query hooks" — the generated files must stay in sync with the
yaml source or the workspace's own typecheck breaks for anyone else.
```

## Scope boundaries

```
Copied verbatim from the spec's own Non-goals section:

- No persistent staging host — the 750h budget doesn't support two always-warm free
  services, and there's no current need for a shareable non-engineer staging URL.
- No staging domain — only production gets a custom subdomain; staging has no
  persistent host to point one at.
- No Render Cron / pg_cron for the Daily Brain job — deferred to an in-process
  scheduler when ROADMAP Phase 4 actually lands (mechanism decided now, per the
  spec's Section 5, but NOT implemented by this plan — do not add node-cron or any
  scheduling dependency now).
- Does not cover Meta Business verification / production WhatsApp number
  provisioning — a Meta-side process with its own timeline, noted as a prerequisite
  in Task 7 Step 4, not designed or executed here.

No drive-by refactors, no reformatting, no dependency changes beyond what Task 2's
codegen naturally regenerates, no renames.
```

## Verification discipline (verbatim, always)

```
- Never claim a test/command passes without pasting its actual output.
- Task 3 Steps 4-5 are the load-bearing proof for this entire plan's design premise:
  the keepalive route must return HTTP 200 in BOTH the no-DATABASE_URL case AND the
  unreachable-DATABASE_URL case. If either returns anything other than 200, STOP —
  do not proceed to Task 4's render.yaml, since the whole point of that file is to
  point an external pinger at an endpoint that's supposed to never fail non-2xx.
- A mocked boundary cannot enforce the contract on the other side of it. Task 3's
  verification boots a REAL server process and curls it — not a unit test with a
  mocked Express app — because the actual regression risk (static import crashing
  the whole server at boot) only manifests when the real module graph loads.
- Task 5 and Task 8 each start with a literal prerequisite-check command
  (`test -f ...`). Run it, read its actual output, and follow the printed
  instruction — don't assume the prerequisite is met because "it was probably done
  by now."
- Delete every temporary/scratch file before committing — Task 3's
  `/tmp/api-keepalive-verify*.log` and `/tmp/api-kv*.pid` files are scratch, not
  meant to be committed (they're outside the repo already, but don't let a stray
  `git add -A` habit pull in anything similar).
```

## Reporting (verbatim, always)

```
After each task: what changed, the VERBATIM output of the verification command, the
commit SHA. If expected output doesn't match observation — especially a non-200 from
the keepalive route in either state Task 3 tests — STOP and report the discrepancy.
Do not proceed hoping it resolves.

For Tasks 6 and 7: do not attempt them. Report clearly that they are human-only
(account creation, DNS editing) and hand the checklist back — quote the exact steps
and values from the plan so the human can execute them without re-reading the whole
plan themselves.

At the end of whichever tasks you CAN complete (1-5, 8, subject to the Task 5/8
prerequisite gate): report which of Tasks 6-7 remain outstanding and that the
production deployment is not live until a human completes them. Do not claim "done"
for this plan as a whole while Tasks 6-7 are unexecuted — the code changes alone do
not constitute a working deployment.
```

---

## Task list at a glance (8 tasks — 6 agent-executable, 2 human-only)

```
1. code/artifacts/api-server/.env.example — commit
2. OpenAPI spec + orval codegen for KeepaliveStatus/KeepaliveResponse — commit
3. /api/keepalive route (always-200, dynamic DB import) — commit
   [LOAD-BEARING verification: both no-DATABASE_URL and unreachable-DATABASE_URL
   paths must return HTTP 200]
4. render.yaml at repo root — commit
5. [PREREQUISITE-GATED] tests/api/keepalive.spec.ts — commit
6. [HUMAN-ONLY] Render service creation, secrets entry, cron-job.org pinger setup
7. [HUMAN-ONLY] Supabase projects (smaran-dev, smaran-prod), DNS CNAME for
   api.smaran.click, Meta webhook registration
8. [PREREQUISITE-GATED] Document deployed topology in the KB — commit
```

---

## Traps specific to this task

- `code/artifacts/api-server` requires `PORT` to be set — the process throws and
  exits immediately if it's unset. Both manual verification commands in Task 3
  (Steps 4 and 5) already pass it explicitly (`PORT=4301`, `PORT=4302`) — don't drop
  it if you rerun these by hand.
- Render's free-tier budget is 750 instance-hours/MONTH shared across the ENTIRE
  workspace, not per-service. Keeping one service perpetually warm (~730h/month)
  already consumes nearly the whole budget — this is WHY there's no second
  always-warm staging service in this design, not an oversight. Don't "helpfully"
  suggest adding a staging Render service when reporting on this plan.
- cron-job.org (and any external uptime pinger) auto-disables a job after repeated
  non-2xx responses. This is the entire reason `/api/keepalive` exists separate from
  the stricter `/api/healthz` — pointing the pinger at `/api/healthz` instead would
  silently break the keep-warm mechanism the first time the DB has a transient
  hiccup. If you ever see a suggestion (from a user, a reviewer, or your own
  reasoning) to simplify by pointing the pinger at `/healthz`, that's the trap this
  design is built to avoid.
- Task 4's `render.yaml` region is `singapore` — chosen to match Vedika's hardcoded
  default coordinates (Varanasi) and general India-proximity, not an arbitrary
  default. Don't change it to `oregon`/`ohio` (Render's more commonly-templated
  defaults) without checking with the human first.
- `python3 -c "import yaml; ..."` (Task 4 Step 2) only validates YAML SYNTAX, not
  Render's own service schema — Render itself validates the schema only when the
  service is actually created in Task 6, which you cannot do. Don't over-claim what
  the syntax check proves.
</content>
