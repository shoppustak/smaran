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
| Background | `--background` | `0 0% 100%` (pure white) | Page background |
| Foreground | `--foreground` | `240 10% 4%` (near-black) | Default text |
| Border | `--border` | `240 6% 90%` | Default borders |
| Card | `--card` / `--card-foreground` / `--card-border` | `0 0% 100%` bg | Card surfaces |
| Popover | `--popover` / `--popover-foreground` / `--popover-border` | `0 0% 100%` bg | Popovers/menus |
| Primary | `--primary` / `--primary-foreground` | `262 83% 58%` (Tango violet) | Primary actions, brand accent |
| Secondary | `--secondary` / `--secondary-foreground` | `16 75% 55%` (Tango terracotta) | Secondary actions |
| Muted | `--muted` / `--muted-foreground` | `240 5% 96%` | De-emphasized surfaces/text |
| Accent | `--accent` / `--accent-foreground` | `240 5% 96%` | Hover/highlight surfaces |
| Destructive | `--destructive` / `--destructive-foreground` | `0 70% 50%` | Errors, destructive actions |
| Sidebar | `--sidebar*` | `240 5% 98%` bg | Sidebar nav surface |
| Chart 1-5 | `--chart-1` … `--chart-5` | violet → terracotta → ink → lavender → sand | Data visualization series |
| Sans font | `--app-font-sans` | `'Inter', sans-serif` | Body text |
| Serif font | `--app-font-serif` | `'Playfair Display', serif` | Headings |
| Mono font | `--app-font-mono` | `Menlo, monospace` | Code, tabular numbers |
| Radius | `--radius` | `0.5rem` (8px) | Base corner radius (`sm`/`md`/`lg`/`xl` derive from this) |

## Dark mode

`.dark` values are defined (see `tokens.css`) but not currently activated in
either app — this is intentional, not a gap. Activate by toggling a `dark`
class on `<html>`/`<body>` if/when dark mode is actually requested.
