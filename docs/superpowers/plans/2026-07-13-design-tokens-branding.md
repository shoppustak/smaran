# Design Tokens & Branding Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the two Tailwind v4 mockup apps (`smaran`, `mockup-sandbox`) one shared, brand-correct token source instead of duplicated/drifted CSS, plus a guidance doc and an ESLint rule so future screens can't hardcode off-brand colors or inline styles.

**Architecture:** New CSS-only pnpm workspace package `lib/design-tokens` holds the canonical brand tokens (copied verbatim from `smaran`'s existing theme — sandalwood/marigold/temple-brass, Fraunces+DM Sans) plus a README guide. Both apps import it via Tailwind v4's CSS-first `@theme`/`@import` mechanism — no JS Tailwind config, no build step. A root ESLint v9 flat config, scoped only to these two apps' `src/` (excluding vendor `components/ui/**`), blocks hardcoded hex/rgb colors and inline `style={{}}`.

**Tech Stack:** Tailwind CSS v4.1.14 (CSS-first `@theme`), pnpm workspaces (`lib/*` glob), Vite + `@tailwindcss/vite`, ESLint v9 flat config + `typescript-eslint`.

## Global Constraints

- Tailwind version is pinned via the workspace catalog: `tailwindcss: ^4.1.14` — do not introduce a different version or a JS `tailwind.config.*` (both apps already use empty `tailwind.config` + CSS-first `@theme`; stay on that pattern).
- `lib/design-tokens` is picked up automatically by the existing `lib/*` glob in `code/pnpm-workspace.yaml:38` — no workspace glob changes needed.
- Token *values* move verbatim from `smaran/src/index.css` — no color/font/radius value changes in this plan, except the one pre-existing off-brand violation fixed in Task 5 (called out explicitly there).
- ESLint config is scoped to `artifacts/smaran/src/**` and `artifacts/mockup-sandbox/src/**` only — never `artifacts/api-server` (not a styling concern there).
- Lint exception path in both apps: `src/components/ui/**` (shadcn-generated vendor primitives) — must stay identical between the ESLint config's `ignores` and the README's documented exception list.
- No git hook wiring — `lint` is a runnable script only, per the approved spec.
- Root `code/package.json` has no `"type": "module"` — the ESLint config file must be `eslint.config.mjs` (explicit ESM extension), not `.js`.

---

### Task 1: Scaffold the `lib/design-tokens` package

**Files:**
- Create: `code/lib/design-tokens/package.json`
- Create: `code/lib/design-tokens/fonts.css`
- Create: `code/lib/design-tokens/tokens.css`
- Create: `code/lib/design-tokens/README.md`

**Interfaces:**
- Produces: importable subpaths `@workspace/design-tokens/fonts.css` and `@workspace/design-tokens/tokens.css`, consumed by Task 2 and Task 3.

- [ ] **Step 1: Create the package manifest**

`code/lib/design-tokens/package.json`:
```json
{
  "name": "@workspace/design-tokens",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./tokens.css": "./tokens.css",
    "./fonts.css": "./fonts.css"
  }
}
```

- [ ] **Step 2: Create `fonts.css`**

`code/lib/design-tokens/fonts.css` (moved verbatim from `smaran/src/index.css:1`):
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
```

- [ ] **Step 3: Create `tokens.css`**

`code/lib/design-tokens/tokens.css` (moved verbatim from `smaran/src/index.css:9-172` — the `@theme` block, `:root`, and `.dark` blocks; no value changes):
```css
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-card-border: hsl(var(--card-border));

  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-popover-border: hsl(var(--popover-border));

  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-primary-border: var(--primary-border);

  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-secondary-border: var(--secondary-border);

  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-muted-border: var(--muted-border);

  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-accent-border: var(--accent-border);

  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-destructive-border: var(--destructive-border);

  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-primary-border: var(--sidebar-primary-border);
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-accent-border: var(--sidebar-accent-border);
  --color-sidebar-ring: hsl(var(--sidebar-ring));

  --font-sans: var(--app-font-sans);
  --font-serif: var(--app-font-serif);
  --font-mono: var(--app-font-mono);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* LIGHT MODE */
:root {
  --button-outline: rgba(0, 0, 0, 0.1);
  --badge-outline: rgba(0, 0, 0, 0.05);

  --opaque-button-border-intensity: -8;

  --elevate-1: rgba(0, 0, 0, 0.03);
  --elevate-2: rgba(0, 0, 0, 0.08);

  /* Sandalwood / Aged paper vibe */
  --background: 40 33% 96%;
  --foreground: 215 20% 20%;

  --border: 40 20% 80%;

  --card: 40 40% 98%;
  --card-foreground: 215 20% 20%;
  --card-border: 40 20% 85%;

  --popover: 40 40% 98%;
  --popover-foreground: 215 20% 20%;
  --popover-border: 40 20% 85%;

  /* Deep Marigold / Kumkum */
  --primary: 28 85% 45%;
  --primary-foreground: 0 0% 100%;

  /* Temple Brass */
  --secondary: 45 40% 60%;
  --secondary-foreground: 0 0% 100%;

  --muted: 40 20% 90%;
  --muted-foreground: 215 10% 45%;

  --accent: 40 30% 90%;
  --accent-foreground: 215 20% 20%;

  --destructive: 0 70% 50%;
  --destructive-foreground: 0 0% 100%;

  --input: 40 20% 80%;
  --ring: 28 85% 45%;

  --sidebar: 40 33% 94%;
  --sidebar-foreground: 215 20% 20%;
  --sidebar-border: 40 20% 85%;
  --sidebar-primary: 28 85% 45%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 40 30% 88%;
  --sidebar-accent-foreground: 215 20% 20%;
  --sidebar-ring: 28 85% 45%;

  --chart-1: 28 85% 45%;
  --chart-2: 45 40% 60%;
  --chart-3: 215 20% 30%;
  --chart-4: 15 60% 50%;
  --chart-5: 40 30% 70%;

  --app-font-sans: 'DM Sans', sans-serif;
  --app-font-serif: 'Fraunces', serif;
  --app-font-mono: Menlo, monospace;

  --radius: 0.5rem; /* 8px */
}

/* No dark mode needed unless explicitly requested, but setting cohesive fallbacks just in case */
.dark {
  --background: 215 20% 10%;
  --foreground: 40 33% 96%;

  --border: 215 20% 20%;

  --card: 215 20% 12%;
  --card-foreground: 40 33% 96%;
  --card-border: 215 20% 20%;

  --popover: 215 20% 12%;
  --popover-foreground: 40 33% 96%;
  --popover-border: 215 20% 20%;

  --primary: 28 85% 55%;
  --primary-foreground: 0 0% 10%;

  --secondary: 45 40% 60%;
  --secondary-foreground: 0 0% 10%;

  --muted: 215 20% 20%;
  --muted-foreground: 40 20% 70%;

  --accent: 215 20% 20%;
  --accent-foreground: 40 33% 96%;

  --destructive: 0 60% 50%;
  --destructive-foreground: 0 0% 100%;

  --input: 215 20% 20%;
  --ring: 28 85% 55%;

  --sidebar: 215 20% 12%;
  --sidebar-foreground: 40 33% 96%;
  --sidebar-border: 215 20% 20%;
  --sidebar-primary: 28 85% 55%;
  --sidebar-primary-foreground: 0 0% 10%;
  --sidebar-accent: 215 20% 20%;
  --sidebar-accent-foreground: 40 33% 96%;
  --sidebar-ring: 28 85% 55%;
}
```

- [ ] **Step 4: Create the guidance README**

`code/lib/design-tokens/README.md`:
```markdown
# @workspace/design-tokens

Single source of truth for Smaran's brand tokens, shared by the `smaran` and
`mockup-sandbox` mockup apps (Tailwind v4, CSS-first `@theme`).

## Usage

In an app's `index.css`, after `@import "tailwindcss";`:

\```css
@import "@workspace/design-tokens/fonts.css";
@import "@workspace/design-tokens/tokens.css";
\```

Then use Tailwind utility classes (`bg-primary`, `text-foreground`,
`rounded-lg`, `font-serif`, ...) — never hardcode a color or reach for an
inline `style={{}}`.

## Core rule

**Always use a token or Tailwind utility class. Never hardcode a color.**
If a screen needs a color that doesn't exist yet, add it to `tokens.css`
first (as a new semantic CSS variable, following the existing naming
pattern), then consume it — don't invent a one-off hex value inline.

This is enforced by an ESLint rule in `eslint.config.mjs` (repo root) for
`artifacts/smaran/src` and `artifacts/mockup-sandbox/src`, except vendor
shadcn primitives under `src/components/ui/**`, which legitimately need
inline styles for computed values (e.g. chart series colors, progress bar
width).

## Token reference

| Semantic name | CSS var | Light value | Usage |
|---|---|---|---|
| Background | `--background` | `40 33% 96%` (sandalwood/aged paper) | Page background |
| Foreground | `--foreground` | `215 20% 20%` | Default text |
| Border | `--border` | `40 20% 80%` | Default borders |
| Card | `--card` / `--card-foreground` / `--card-border` | `40 40% 98%` bg | Card surfaces |
| Popover | `--popover` / `--popover-foreground` / `--popover-border` | `40 40% 98%` bg | Popovers/menus |
| Primary | `--primary` / `--primary-foreground` | `28 85% 45%` (deep marigold/kumkum) | Primary actions, brand accent |
| Secondary | `--secondary` / `--secondary-foreground` | `45 40% 60%` (temple brass) | Secondary actions |
| Muted | `--muted` / `--muted-foreground` | `40 20% 90%` | De-emphasized surfaces/text |
| Accent | `--accent` / `--accent-foreground` | `40 30% 90%` | Hover/highlight surfaces |
| Destructive | `--destructive` / `--destructive-foreground` | `0 70% 50%` | Errors, destructive actions |
| Sidebar | `--sidebar*` | `40 33% 94%` bg | Sidebar nav surface |
| Chart 1-5 | `--chart-1` … `--chart-5` | marigold → brass → ink → terracotta → sand | Data visualization series |
| Sans font | `--app-font-sans` | `'DM Sans', sans-serif` | Body text |
| Serif font | `--app-font-serif` | `'Fraunces', serif` | Headings (`h1`-`h6`) |
| Mono font | `--app-font-mono` | `Menlo, monospace` | Code, tabular numbers |
| Radius | `--radius` | `0.5rem` (8px) | Base corner radius (`sm`/`md`/`lg`/`xl` derive from this) |

## Dark mode

`.dark` values are defined (see `tokens.css`) but not currently activated in
either app — this is intentional, not a gap. Activate by toggling a `dark`
class on `<html>`/`<body>` if/when dark mode is actually requested.
```

- [ ] **Step 5: Install and verify the package resolves in the workspace**

Run:
```bash
cd /Users/maulik/smaran/code
pnpm install
```
Expected: install succeeds, and `@workspace/design-tokens` appears in the workspace package list:
```bash
pnpm list -r --depth -1 | grep design-tokens
```
Expected output: `@workspace/design-tokens@0.0.0` (path `lib/design-tokens`).

- [ ] **Step 6: Commit**

```bash
cd /Users/maulik/smaran
git add code/lib/design-tokens
git commit -m "feat(design-tokens): scaffold shared brand token package"
```

---

### Task 2: Migrate `smaran` to consume the shared tokens

**Files:**
- Modify: `code/artifacts/smaran/package.json`
- Modify: `code/artifacts/smaran/src/index.css`

**Interfaces:**
- Consumes: `@workspace/design-tokens/fonts.css`, `@workspace/design-tokens/tokens.css` (Task 1).

- [ ] **Step 1: Add the dependency**

In `code/artifacts/smaran/package.json`, add to `devDependencies` (alphabetical position, alongside the existing `@workspace/api-client-react` entry):
```json
    "@workspace/design-tokens": "workspace:*",
```

- [ ] **Step 2: Replace `index.css` to import the shared tokens**

Replace the full contents of `code/artifacts/smaran/src/index.css` (currently lines 1-172 hold what's moving to the shared package) with:
```css
@import 'tailwindcss';
@import '@workspace/design-tokens/fonts.css';
@import '@workspace/design-tokens/tokens.css';
@import 'tw-animate-css';
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-serif font-medium tracking-tight text-foreground;
  }
}

@layer utilities {
  input[type='search']::-webkit-search-cancel-button {
    @apply hidden;
  }

  [contenteditable][data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }
}

/* Paper texture effect for specific containers */
.paper-texture {
  position: relative;
}
.paper-texture::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.4;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
```

(This is the same file minus the `@theme`/`:root`/`.dark` block, which now lives in `tokens.css`, plus two new `@import` lines pointing at the shared package. The app-local `.paper-texture` effect and base/utility layers stay put — they're specific to `smaran`, not shared brand tokens.)

- [ ] **Step 3: Install and typecheck**

```bash
cd /Users/maulik/smaran/code
pnpm install
pnpm --filter @workspace/smaran run typecheck
```
Expected: both succeed with no errors.

- [ ] **Step 4: Build and verify the resolved CSS is unchanged**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run build
grep -o "28 85% 45%" artifacts/smaran/dist/assets/*.css | head -1
```
Expected: the `grep` finds at least one match — proving the marigold primary hue (`28 85% 45%`) still resolves into the built CSS after the refactor, i.e. no value was lost in the move.

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/smaran/package.json code/artifacts/smaran/src/index.css
git commit -m "refactor(smaran): consume shared design tokens package"
```

---

### Task 3: Migrate `mockup-sandbox` to consume the shared tokens (brands it)

**Files:**
- Modify: `code/artifacts/mockup-sandbox/package.json`
- Modify: `code/artifacts/mockup-sandbox/src/index.css`

**Interfaces:**
- Consumes: `@workspace/design-tokens/fonts.css`, `@workspace/design-tokens/tokens.css` (Task 1).

- [ ] **Step 1: Add the dependency**

In `code/artifacts/mockup-sandbox/package.json`, add to `devDependencies` (alphabetical position, near `@tailwindcss/vite`):
```json
    "@workspace/design-tokens": "workspace:*",
```

- [ ] **Step 2: Replace `index.css` to import the shared tokens, dropping the old generic theme**

Replace the full contents of `code/artifacts/mockup-sandbox/src/index.css` with:
```css
@import "tailwindcss";
@import "@workspace/design-tokens/fonts.css";
@import "@workspace/design-tokens/tokens.css";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}

@layer utilities {
  /* Hide ugly search cancel button in Chrome */
  input[type="search"]::-webkit-search-cancel-button {
    @apply hidden;
  }

  /* Placeholder styling for contentEditable div */
  [contenteditable][data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }
}
```

(This drops the app's old generic shadcn `@theme`/`:root`/`.dark` block entirely — including its unused `--text-*` size overrides, which just restated Tailwind's own defaults, and its unused `--spacing` override, which was misplaced outside any `@theme` block and had no effect. Confirmed via grep before writing this plan: `mockup-sandbox/src` has zero usages of `chart-*`/`sidebar-*` Tailwind utility classes and zero usages of `font-mono` outside the vendor `components/ui/chart.tsx`, so dropping the old theme's extra mappings causes no visual regression.)

- [ ] **Step 3: Install and typecheck**

```bash
cd /Users/maulik/smaran/code
pnpm install
pnpm --filter @workspace/mockup-sandbox run typecheck
```
Expected: both succeed with no errors.

- [ ] **Step 4: Build and verify the brand tokens resolved, old generic tokens gone**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/mockup-sandbox run build
grep -o "28 85% 45%" artifacts/mockup-sandbox/dist/assets/*.css | head -1
grep -c "240 5.9% 10%" artifacts/mockup-sandbox/dist/assets/*.css
```
Expected: the first `grep` finds the marigold primary hue (brand now applied). The second `grep -c` (counting the old generic dark-gray primary value `240 5.9% 10%`) returns `0` — the old unbranded token is gone from the build output.

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/mockup-sandbox/package.json code/artifacts/mockup-sandbox/src/index.css
git commit -m "refactor(mockup-sandbox): consume shared design tokens, apply Smaran brand"
```

---

### Task 4: Add ESLint catalog entries and root flat config

**Files:**
- Modify: `code/pnpm-workspace.yaml`
- Create: `code/eslint.config.mjs`
- Modify: `code/artifacts/smaran/package.json`
- Modify: `code/artifacts/mockup-sandbox/package.json`
- Modify: `code/package.json`

**Interfaces:**
- Produces: `pnpm --filter @workspace/smaran run lint` and `pnpm --filter @workspace/mockup-sandbox run lint` scripts, used by Task 5.

- [ ] **Step 1: Add `eslint` and `typescript-eslint` to the pnpm catalog**

In `code/pnpm-workspace.yaml`, inside the existing `catalog:` block (`code/pnpm-workspace.yaml:43`), add two entries in alphabetical position:
```yaml
  eslint: ^9.18.0
  typescript-eslint: ^8.20.0
```

- [ ] **Step 2: Add both packages as root devDependencies**

In `code/package.json`, add to `devDependencies`:
```json
    "eslint": "catalog:",
    "typescript-eslint": "catalog:",
```
(The root config file's `import` statements resolve from `code/node_modules`, so `typescript-eslint` must be reachable there.)

- [ ] **Step 3: Add both packages as devDependencies in each app**

In `code/artifacts/smaran/package.json` and `code/artifacts/mockup-sandbox/package.json`, add to `devDependencies`:
```json
    "eslint": "catalog:",
    "typescript-eslint": "catalog:",
```
(Each app's own `lint` script invokes the local `eslint` binary — pnpm only creates `node_modules/.bin/eslint` for packages that declare `eslint` as their own dependency, so this is needed in both apps, not just root.)

- [ ] **Step 4: Add the `lint` script to both apps**

In `code/artifacts/smaran/package.json` `scripts`:
```json
    "lint": "eslint src --config ../../eslint.config.mjs",
```
In `code/artifacts/mockup-sandbox/package.json` `scripts`:
```json
    "lint": "eslint src --config ../../eslint.config.mjs",
```

- [ ] **Step 5: Create the root ESLint flat config**

`code/eslint.config.mjs`:
```js
import tseslint from "typescript-eslint";

const brandStyleRules = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "Literal[value=/^#([0-9a-fA-F]{3}){1,2}$/]",
      message:
        "Hardcoded hex colors are not allowed — use a design token or Tailwind utility class from @workspace/design-tokens instead.",
    },
    {
      selector: "Literal[value=/^rgba?\\(/]",
      message:
        "Hardcoded rgb()/rgba() colors are not allowed — use a design token or Tailwind utility class from @workspace/design-tokens instead.",
    },
    {
      selector: "JSXAttribute[name.name='style']",
      message:
        "Inline style={{}} is not allowed in app code — use Tailwind utility classes backed by design tokens instead.",
    },
  ],
};

export default tseslint.config({
  files: [
    "artifacts/smaran/src/**/*.{ts,tsx}",
    "artifacts/mockup-sandbox/src/**/*.{ts,tsx}",
  ],
  ignores: [
    "artifacts/smaran/src/components/ui/**",
    "artifacts/mockup-sandbox/src/components/ui/**",
  ],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
  rules: brandStyleRules,
});
```

- [ ] **Step 6: Install**

```bash
cd /Users/maulik/smaran/code
pnpm install
```
Expected: succeeds, `eslint` and `typescript-eslint` now present in `node_modules` for root, `artifacts/smaran`, and `artifacts/mockup-sandbox`.

- [ ] **Step 7: Commit**

```bash
cd /Users/maulik/smaran
git add code/pnpm-workspace.yaml code/package.json code/eslint.config.mjs \
  code/artifacts/smaran/package.json code/artifacts/mockup-sandbox/package.json
git commit -m "chore: add ESLint flat config enforcing brand token usage"
```

---

### Task 5: Prove the lint rule fires, fix the one pre-existing violation, verify clean

**Files:**
- Modify: `code/artifacts/mockup-sandbox/src/App.tsx:79`
- Test (temporary, deleted within this task): `code/artifacts/smaran/src/App.tsx`

**Interfaces:**
- Consumes: `pnpm --filter @workspace/smaran run lint` / `pnpm --filter @workspace/mockup-sandbox run lint` (Task 4).

- [ ] **Step 1: Prove the rule fires — introduce a deliberate violation**

Temporarily add a hex color and an inline style to `code/artifacts/smaran/src/App.tsx`. First check the current top of the file:
```bash
cd /Users/maulik/smaran/code
head -5 artifacts/smaran/src/App.tsx
```
Then add this throwaway line right after the last existing `import` statement in that file:
```tsx
const __lintProbe = <div style={{ color: "#ff0000" }} />;
```

- [ ] **Step 2: Run lint, confirm it fails on the probe**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run lint
```
Expected: FAILS with two `no-restricted-syntax` errors on the probe line — one for the hex color literal, one for the `style` JSX attribute.

- [ ] **Step 3: Remove the probe**

Delete the `const __lintProbe = ...` line added in Step 1. Confirm it's gone:
```bash
cd /Users/maulik/smaran/code
grep -c "__lintProbe" artifacts/smaran/src/App.tsx
```
Expected: `0`.

- [ ] **Step 4: Run lint again, confirm smaran is clean**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run lint
```
Expected: PASSES with no errors (the only pre-existing hex/inline-style usages in `smaran` are in `src/components/ui/chart.tsx` and `src/components/ui/progress.tsx`, both under the excluded `components/ui/**` path).

- [ ] **Step 5: Run lint on mockup-sandbox, confirm it catches the real pre-existing violation**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/mockup-sandbox run lint
```
Expected: FAILS with one error, on `artifacts/mockup-sandbox/src/App.tsx:79` (`<pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>`) — this is a real pre-existing violation the new rule is designed to catch, not the vendor `components/ui/chart.tsx`/`progress.tsx` files (those are excluded and won't appear in the output).

- [ ] **Step 6: Fix the real violation**

In `code/artifacts/mockup-sandbox/src/App.tsx`, replace:
```tsx
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
```
with:
```tsx
      <pre className="text-destructive p-8 font-[system-ui]">
```
(`text-destructive` maps to the brand's `--destructive` token — semantically correct for an error message, and closer to the intent than a hardcoded `"red"`. `p-8` = `2rem` exactly on Tailwind's default 0.25rem spacing scale. `font-[system-ui]` preserves the original robustness intent — a font that renders even if the brand's custom Google Fonts fail to load — without using the banned `style` attribute.)

- [ ] **Step 7: Run lint again, confirm mockup-sandbox is now clean**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/mockup-sandbox run lint
```
Expected: PASSES with no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/mockup-sandbox/src/App.tsx
git commit -m "fix(mockup-sandbox): replace inline error-fallback style with brand tokens"
```

---

### Task 6: Full workspace verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck across the workspace**

```bash
cd /Users/maulik/smaran/code
pnpm run typecheck
```
Expected: succeeds with no errors.

- [ ] **Step 2: Full build across the workspace**

```bash
cd /Users/maulik/smaran/code
pnpm run build
```
Expected: succeeds with no errors (runs typecheck + all packages' build, including both apps and `api-server`).

- [ ] **Step 3: Both apps' lint clean in one pass**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run lint && pnpm --filter @workspace/mockup-sandbox run lint
```
Expected: both pass with no errors.

- [ ] **Step 4: Manual visual spot-check**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run dev
```
Open the printed local URL, confirm the app renders with the sandalwood/marigold/temple-brass theme exactly as before (Fraunces headings, DM Sans body). Stop the server (Ctrl-C), then:
```bash
pnpm --filter @workspace/mockup-sandbox run dev
```
Open the printed local URL, confirm it now also renders with the Smaran brand theme (marigold primary, Fraunces headings) instead of the old generic black-and-white shadcn defaults. Stop the server (Ctrl-C).

No commit for this task — verification only, no file changes expected.
