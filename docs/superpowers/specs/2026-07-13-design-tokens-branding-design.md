# Design Tokens & Branding Standardization

Date: 2026-07-13

## Context

The repo has two Tailwind v4 + shadcn/ui React/Vite apps under `code/artifacts/`:

- `smaran/` — the primary mockup app (Dashboard, Roster, Recover, Protect, Collect, Referral, Settings, Onboarding, AddEntry). Already carries a deliberate brand theme in `src/index.css`: sandalwood/aged-paper background, deep-marigold/kumkum primary, temple-brass secondary, Fraunces (serif headings) + DM Sans (body) typography.
- `mockup-sandbox/` — a second sandbox, still on generic/unbranded shadcn default tokens (placeholder grays, no custom fonts).

Per `.planning/PROJECT.md`, the actual shipped product is WhatsApp-only (WhatsApp Cloud API, hub-and-spoke) — a consumer web UI/app/portal is explicitly out of scope (locked negative constraint). Both React apps exist as **design/prototype sandboxes** for previewing WhatsApp card content and value-ladder states, not as a shipped web product.

Tokens are currently duplicated per-app with no shared source, so the two apps have already drifted (one branded, one not), and nothing stops future screens from hardcoding colors instead of using tokens.

## Goal

Single source of truth for design tokens (colors, typography, radius) shared by both apps, with a guidance doc so contributors use tokens/Tailwind utilities instead of hardcoded/inline styles, plus lint enforcement to catch drift automatically. Token format should also be reusable by a future WhatsApp card-image rendering pipeline (not yet built) — satisfied by keeping tokens as plain CSS custom properties, which render correctly in any headless-browser-based renderer (Puppeteer/Playwright) without extra tooling.

## Non-goals

- No shipped web UI — this does not create or imply a new product surface.
- No card-image rendering pipeline is being built now — only keeping the token format compatible with one later.
- No JS/TS token codegen (style-dictionary-style) — deferred unless a non-browser renderer (e.g. Satori, which needs raw JS values) is actually chosen later.
- No git-hook wiring for lint — script is added and CI/manually runnable, not enforced pre-commit (not requested).

## Design

### 1. Shared package: `code/lib/design-tokens/`

New pnpm workspace package, CSS-only, no build step:

```
lib/design-tokens/
  package.json      — name: @workspace/design-tokens
  tokens.css         — @theme block + :root/.dark custom properties (colors, radius, chart palette)
  fonts.css           — Google Fonts @import (Fraunces + DM Sans)
  README.md          — token reference table + usage rules
```

Canonical values are `smaran/`'s existing brand theme, moved verbatim (no value changes). `mockup-sandbox/`'s old generic `:root`/`.dark` blocks are deleted and replaced by importing this package — bringing it onto-brand for the first time.

Resolution works the same way any other workspace package resolves today (`@tailwindcss/vite` + pnpm workspace linking) — no new build step, no JS Tailwind config reintroduced (both apps already use Tailwind v4's CSS-first `@theme` config with empty `tailwind.config`).

### 2. App integration

Both `smaran/src/index.css` and `mockup-sandbox/src/index.css` reduce to:

```css
@import "@workspace/design-tokens/fonts.css";
@import "@workspace/design-tokens/tokens.css";
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";  /* smaran only */

@custom-variant dark (&:is(.dark *));

/* app-specific @layer base/utilities stay local, e.g. smaran's .paper-texture */
```

Each app adds `"@workspace/design-tokens": "workspace:*"` to its `package.json` dependencies. `components.json` (shadcn config) is unchanged — it only points at `src/index.css`, which still exists locally per app, just slimmer.

### 3. Lint enforcement

No ESLint exists in the repo yet. Add a root-level flat config (`eslint.config.js`) scoped to `artifacts/smaran/src` and `artifacts/mockup-sandbox/src` only (not the API server — this is a styling concern, not a general code-quality pass):

- `no-restricted-syntax` blocking hex color literals (`/^#([0-9a-fA-F]{3}){1,2}$/`) and `rgb(`/`rgba(` string literals in `.tsx`/`.ts`.
- `no-restricted-syntax` blocking `JSXAttribute[name.name='style']` (inline `style={{}}`), **except** under `src/components/ui/**` — shadcn-generated vendor primitives (e.g. `chart.tsx`) legitimately need inline style for computed values; these are vendor files, not app code.
- `pnpm lint` script added to each app's `package.json`, runnable manually/in CI. Not wired to a pre-commit hook.

The allowlisted exception paths are documented in both the ESLint config comment and the README, so they can't silently drift apart.

### 4. Guidance doc (`lib/design-tokens/README.md`)

Contents:
- Token reference table: semantic name → CSS var → current value → intended usage.
- Typography scale: Fraunces (serif, headings) vs DM Sans (sans, body) roles.
- Radius scale.
- Dark mode status: tokens are defined but currently unused in either app (per existing `smaran` comment "No dark mode needed unless explicitly requested") — documented as-is, not activated.
- Core rule: always use a token or Tailwind utility; never hardcode a color; new colors get added to `tokens.css` first, then consumed — not invented inline.
- The lint exception list (shadcn vendor components under `components/ui/`), kept in sync with the actual ESLint config.

### 5. Migration & verification steps

1. Create `lib/design-tokens` package, move `smaran`'s token block into it verbatim.
2. Point both apps' `index.css` at the shared package; delete `mockup-sandbox`'s old generic tokens.
3. Add ESLint config + `lint` scripts to both apps.
4. Run `pnpm typecheck` (repo-wide) — must stay green.
5. Run `pnpm --filter smaran lint` / `pnpm --filter mockup-sandbox lint` — confirm the rule fires on the known `chart.tsx` exceptions (proves the allowlist works, not just that the rule exists), and that it's clean elsewhere.
6. Start both apps' dev servers, visually spot-check they render identically to before the refactor (values are byte-identical, so no visual regression expected) and that `mockup-sandbox` now shows the Smaran brand instead of generic shadcn defaults.

## Open items

None — all clarified during brainstorming (scope includes future card-rendering compatibility; enforcement includes lint, not just docs).
