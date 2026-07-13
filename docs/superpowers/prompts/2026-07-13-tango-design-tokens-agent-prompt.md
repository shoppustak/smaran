# Agent Prompt — Tango-Style Design Tokens Overhaul

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
You are implementing a written plan. Read it in full before touching anything:

Plan: docs/superpowers/plans/2026-07-13-tango-design-tokens.md
Project constraints, repo layout, and working rules:
/Users/maulik/smaran/CLAUDE.md

No separate design spec exists for this plan — the palette/font values in the
plan ARE the approved decisions (sampled directly from the Tango reference
screenshots named in the plan's own header). Do not re-derive or second-guess
those values; implement them verbatim.

REQUIRED SUB-SKILL (per the plan's own header): use superpowers:subagent-driven-development
(recommended) or superpowers:executing-plans to run this task-by-task.

Execute the plan task by task. Each task ends with a commit and an independently
verifiable deliverable. Do not skip ahead, do not batch tasks, do not improvise work
the plan does not ask for.

## Goal
Replace the current Sandalwood/Marigold/Temple-Brass theme in the already-existing
`@workspace/design-tokens` package with a Tango-inspired palette (violet primary
`262 83% 58%`, terracotta-orange secondary `16 75% 55%`, white/near-black neutrals,
Inter sans + Playfair Display serif) — token VALUES only, no component rebuilds,
no page-for-page copying of any Tango flow. Also fixes one unrelated but adjacent
bug: the sidebar logo mark (`mark-180.png`) is nearly invisible against the sidebar
background at its current size/color.
```

## Repository topology

```
ONE git repository, but TWO independent projects inside it:

- /Users/maulik/smaran — the outer root: docs/, .planning/, knowledgebase/, and a
  standalone npm project for the Playwright E2E suite. NOT part of the pnpm workspace
  below.
- /Users/maulik/smaran/code — a SEPARATE pnpm workspace (own package.json,
  pnpm-workspace.yaml): artifacts/{api-server,smaran,mockup-sandbox}, lib/*.

Running an `npm` command meant for the root from inside `code/`, or a `pnpm` command
meant for `code/` from the root, fails or silently no-ops. Use `pnpm --dir code <cmd>`
from the root rather than `cd`-ing, where practical.

This task touches ONLY `code/` — specifically `code/lib/design-tokens/tokens.css`,
`code/lib/design-tokens/fonts.css`, `code/lib/design-tokens/README.md`, and
`code/artifacts/smaran/src/components/layout.tsx`. Nothing in this plan touches the
outer root, `code/artifacts/mockup-sandbox` source (it inherits the token change
automatically — no edits needed there), `code/artifacts/api-server`, or any package.json
/ eslint config. If you find yourself editing anything outside those four files, stop —
that's not in scope for this plan.
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

## Branch-state check — run before the FIRST command

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
no secrets, no env vars, and no credentials — it is CSS and one TSX component only.
If any step you're about to run seems to require a secret, stop — that means you've
drifted from the plan.
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
- Do not deviate from the exact HSL/hex values named in the plan. If a value looks
  "off" once rendered, that is a signal to STOP and ask, not to silently adjust it —
  the values were sampled from the reference screenshots, not invented.
- Do not touch `mockup-sandbox` source files — it consumes `@workspace/design-tokens`
  already and needs no edits; the token change alone re-brands it (this is intentional
  fan-in, not a gap in the plan).
- Do not add or modify the ESLint config file itself. If Task 4's inline `style` on the
  logo mask trips the existing `no-restricted-syntax` rule from the prior design-tokens
  plan, the fix is a documented exception (comment in the code and a note back to the
  human), not silently editing `code/eslint.config.mjs`.
```

## Fan-in check

```
`code/lib/design-tokens/tokens.css` is consumed by BOTH `artifacts/smaran` AND
`artifacts/mockup-sandbox` (wired up by an earlier, already-executed plan). Task 1-2 of
THIS plan edit that shared file — the moment those commits land, BOTH apps' rendering
changes simultaneously. This is intended (that's the whole point), but it means: don't
assume the visual check in Task 3 covering `smaran` alone is sufficient — the plan's own
Task 3 Step 2 explicitly checks `mockup-sandbox` too. Run both dev-server checks, don't
skip the second because "it's the same tokens.css."
```

## Scope boundaries

```
- Token VALUES and fonts only (Task 1-2) — no new CSS custom properties, no renames of
  existing ones, no restructuring of the `@theme` block's mappings.
- Task 4 (logo mark fix) is scoped to `layout.tsx`'s sidebar mark only — do not touch
  the favicon, `mark-32.png`/`mark-512.png` usages elsewhere, or the onboarding page's
  own logo usage (`src/pages/onboarding.tsx`) unless the plan names it (it doesn't).
- No dark-mode toggle is being added — the plan's `.dark` block update (Task 1 Step 2)
  keeps dark mode internally consistent with the new palette but remains inert (no
  `dark` class is ever applied by either app today). Do not wire up a toggle.
- No drive-by refactors, no reformatting of files beyond the named diffs.
```

## Verification discipline (verbatim, always)

```
- Never claim a test/command passes without pasting its actual output.
- Task 3 is deliberately visual — "typecheck passes" and "build succeeds" are NOT
  sufficient signal that the palette is correct. Actually start each dev server and
  look at the rendered page before declaring Task 3 done.
- A mocked boundary cannot enforce the contract on the other side of it — if you only
  check `smaran`'s dev server and skip `mockup-sandbox`'s, you have not verified the
  fan-in claim above; do both.
- For Task 4, "the mask div renders" is not the bar — confirm the icon is now
  clearly visible (not just present) against `bg-sidebar` at the new `h-12 w-12` size.
```

## Reporting (verbatim, always)

```
After each task: what changed, the VERBATIM output of the verification command (or a
description of what was visually observed, for the dev-server checks), the commit SHA.
If expected output doesn't match observation, STOP and report the discrepancy. Do not
proceed hoping it resolves.

At Task 3 (verification-only, no commit expected): run typecheck/build, then both dev
servers, report what you see, and STOP before starting Task 4 — confirm with the human
that the palette looks right before recoloring the logo mark to match it.
```

---

## Task list at a glance (4 tasks)

```
1. Rewrite lib/design-tokens/tokens.css — :root and .dark blocks, Tango violet/terracotta
   palette, white/near-black neutrals — commit
2. Rewrite lib/design-tokens/fonts.css (Inter + Playfair Display) and update README's
   token reference table — commit
3. Full workspace typecheck/build + visual spot-check of BOTH apps — no commit
4. Recolor + enlarge the sidebar logo mark (mark-180.png) via CSS mask so it's visible
   against bg-sidebar — commit
```

---

## Traps specific to this task

- `mark-180.png` is thin linework with a transparent background, not a flat-color
  glyph — you cannot "just add `text-primary`" to an `<img>` tag to recolor it. The
  plan's Task 4 uses a CSS `mask-image` (with the `-webkit-` prefixed duplicate
  properties, both required for cross-browser support) on a `<div>` with `bg-primary`,
  not the `<img>` element. Follow that pattern exactly.
- The `mask-image` approach requires an inline `style={{}}` in `layout.tsx` for
  properties Tailwind utilities don't express (`maskImage`, `maskSize`, etc. — Tailwind
  v4 has no built-in mask utilities as of the pinned version). This WILL likely trip the
  `no-restricted-syntax` ESLint rule from the earlier design-tokens-branding plan if you
  run lint on `smaran`. Do not work around this by editing the ESLint config yourself —
  flag it and let the human decide whether to extend the config's exception list.
- `code/pnpm-workspace.yaml`'s `overrides` block strips non-Linux native binaries — a
  bare `vite dev`/`vite build` for `smaran` or `mockup-sandbox` can fail on macOS with
  a missing `@rollup/rollup-darwin-*` binary. If Task 3's dev-server visual check fails
  for this reason, that's a pre-existing environment issue, not a sign the token
  refactor is broken — report it and fall back to reading the built CSS output.
</content>
