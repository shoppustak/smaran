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
