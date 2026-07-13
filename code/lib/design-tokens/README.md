# @workspace/design-tokens

Single source of truth for Smaran's brand tokens, shared by the `smaran` and
`mockup-sandbox` mockup apps (Tailwind v4, CSS-first `@theme`).

## Usage

In an app's `index.css`, after `@import "tailwindcss";`:

```css
@import "@workspace/design-tokens/fonts.css";
@import "@workspace/design-tokens/tokens.css";
```

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
