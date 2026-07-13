# Tango-Style Design Tokens — Overhaul Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Sandalwood/Marigold/Brass theme in `@workspace/design-tokens` with a palette and type system that closely follows the `docs/design ref/refero.design - *` (Tango) reference screenshots — used as visual/interaction inspiration, not a literal page-for-page clone of any Tango flow (onboarding, Pro upsell, etc. are NOT being copied).

**Scope:** Token values only — `code/lib/design-tokens/tokens.css` and `code/lib/design-tokens/fonts.css`. No component/page rebuilds. Applies automatically to both `smaran` and `mockup-sandbox` (both already import the shared package per the prior design-tokens-branding plan).

**Reference values** — sampled directly from `docs/design ref/refero.design - Signing up & onboarding on Tango/step - 1.jpg` and `docs/design ref/refero.design - Subscribing to Pro on Tango/step - 1.jpg`:
- Primary: vivid violet/purple (share button, "Guide Me enabled" badge, Pro pill) → `262 83% 58%` (≈ `#7C3AED`)
- Accent/secondary: warm terracotta-orange (Tango wordmark) → `16 75% 55%` (≈ `#DE5B33`)
- Background: pure white, foreground: near-black neutral gray (not blue-tinted) — clean SaaS look
- Headline/body: sans-serif (Inter). Serif appears only on select panel titles (e.g. "Share" modal heading) — Playfair Display, used sparingly via `font-serif`.

No open questions remain — values below are final.

## Global Constraints

- Same Tailwind v4 CSS-first `@theme` mechanism already in place — no JS config changes.
- Edit `tokens.css` and `fonts.css` in place; do not restructure the package (`package.json`/`README.md` exports stay as-is except the token reference table, updated in Task 2).
- Both `:root` (light) and `.dark` blocks must be updated together — the previous pass only touched `:root`, leaving dark mode stale. Fix that gap here.
- No dark-mode toggle exists in either app yet — `.dark` values are still inert, but must be internally consistent (not deleted, not left with old warm hues).

---

### Task 1: Rewrite `tokens.css` with the Tango palette

**Files:**
- Modify: `code/lib/design-tokens/tokens.css`

- [ ] **Step 1: Replace the `:root` (light) block**

Replace the `:root { ... }` block in `code/lib/design-tokens/tokens.css` with:
```css
/* LIGHT MODE */
:root {
  --button-outline: rgba(0, 0, 0, 0.1);
  --badge-outline: rgba(0, 0, 0, 0.05);

  --opaque-button-border-intensity: -8;

  --elevate-1: rgba(0, 0, 0, 0.03);
  --elevate-2: rgba(0, 0, 0, 0.08);

  /* Clean white / near-black, Tango-style */
  --background: 0 0% 100%;
  --foreground: 240 10% 4%;

  --border: 240 6% 90%;

  --card: 0 0% 100%;
  --card-foreground: 240 10% 4%;
  --card-border: 240 6% 90%;

  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 4%;
  --popover-border: 240 6% 90%;

  /* Tango violet */
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;

  /* Tango terracotta-orange */
  --secondary: 16 75% 55%;
  --secondary-foreground: 0 0% 100%;

  --muted: 240 5% 96%;
  --muted-foreground: 240 4% 46%;

  --accent: 240 5% 96%;
  --accent-foreground: 240 10% 4%;

  --destructive: 0 70% 50%;
  --destructive-foreground: 0 0% 100%;

  --input: 240 6% 90%;
  --ring: 262 83% 58%;

  --sidebar: 240 5% 98%;
  --sidebar-foreground: 240 10% 4%;
  --sidebar-border: 240 6% 90%;
  --sidebar-primary: 262 83% 58%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 5% 94%;
  --sidebar-accent-foreground: 240 10% 4%;
  --sidebar-ring: 262 83% 58%;

  --chart-1: 262 83% 58%;
  --chart-2: 16 75% 55%;
  --chart-3: 240 10% 25%;
  --chart-4: 280 60% 65%;
  --chart-5: 240 5% 70%;

  --app-font-sans: 'Inter', sans-serif;
  --app-font-serif: 'Playfair Display', serif;
  --app-font-mono: Menlo, monospace;

  --radius: 0.5rem; /* 8px */
}
```

- [ ] **Step 2: Replace the `.dark` block**

Replace the `.dark { ... }` block with:
```css
.dark {
  --background: 240 10% 4%;
  --foreground: 0 0% 98%;

  --border: 240 6% 20%;

  --card: 240 8% 7%;
  --card-foreground: 0 0% 98%;
  --card-border: 240 6% 20%;

  --popover: 240 8% 7%;
  --popover-foreground: 0 0% 98%;
  --popover-border: 240 6% 20%;

  --primary: 263 70% 68%;
  --primary-foreground: 240 10% 4%;

  --secondary: 18 80% 65%;
  --secondary-foreground: 240 10% 4%;

  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;

  --accent: 240 4% 16%;
  --accent-foreground: 0 0% 98%;

  --destructive: 0 60% 50%;
  --destructive-foreground: 0 0% 100%;

  --input: 240 4% 16%;
  --ring: 263 70% 68%;

  --sidebar: 240 8% 7%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-border: 240 6% 20%;
  --sidebar-primary: 263 70% 68%;
  --sidebar-primary-foreground: 240 10% 4%;
  --sidebar-accent: 240 4% 16%;
  --sidebar-accent-foreground: 0 0% 98%;
  --sidebar-ring: 263 70% 68%;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/maulik/smaran
git add code/lib/design-tokens/tokens.css
git commit -m "feat(design-tokens): replace Sandalwood theme with Tango-inspired violet/terracotta palette"
```

---

### Task 2: Rewrite `fonts.css` and the README token table

**Files:**
- Modify: `code/lib/design-tokens/fonts.css`
- Modify: `code/lib/design-tokens/README.md`

- [ ] **Step 1: Swap the Google Fonts import**

Replace the contents of `code/lib/design-tokens/fonts.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
```

- [ ] **Step 2: Update the README token reference table**

In `code/lib/design-tokens/README.md`, replace the token reference table's color/font rows to match the new values (background white, foreground near-black, primary violet `262 83% 58%`, secondary terracotta `16 75% 55%`, sans `Inter`, serif `Playfair Display` used sparingly for panel titles). Update the header comment above the table if it references "sandalwood/marigold".

- [ ] **Step 3: Commit**

```bash
cd /Users/maulik/smaran
git add code/lib/design-tokens/fonts.css code/lib/design-tokens/README.md
git commit -m "feat(design-tokens): swap to Inter/Playfair Display fonts, update README"
```

---

### Task 3: Verify

- [ ] **Step 1: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm run typecheck
pnpm run build
```
Expected: both succeed.

- [ ] **Step 2: Visual spot-check both apps**

```bash
pnpm --filter @workspace/smaran run dev
```
Confirm: white background, near-black text, violet primary buttons/links, terracotta secondary accents, Inter body text, Playfair Display only where `font-serif` is explicitly used (headings).

```bash
pnpm --filter @workspace/mockup-sandbox run dev
```
Confirm same palette applied.

No commit for this task — verification only.

---

### Task 4: Fix low-contrast sidebar logo mark

**Files:**
- Modify: `code/artifacts/smaran/src/components/layout.tsx`

**Problem:** `mark-180.png` is thin gray linework on a transparent background, rendered at `h-9 w-9` (36px) next to the wordmark (`layout.tsx:30`). Against `bg-sidebar`, the thin strokes are nearly invisible (confirmed visually).

- [ ] **Step 1: Recolor the mark to `--primary` via CSS mask, and enlarge it**

Replace `layout.tsx:30`:
```tsx
<img src="/mark-180.png" alt="" className="h-9 w-9 shrink-0" />
```
with:
```tsx
<div
  className="h-12 w-12 shrink-0 bg-primary"
  style={{
    maskImage: "url(/mark-180.png)",
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskImage: "url(/mark-180.png)",
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
  }}
  aria-hidden="true"
/>
```
(`mask-image` uses the PNG's alpha channel as a stencil and fills it with `bg-primary` — recolors the linework to the new Tango violet without regenerating the asset. Note: this is the one place in `smaran/src` that legitimately needs an inline `style` for computed mask properties not expressible as Tailwind utilities — same category as the excluded `components/ui/**` vendor files; if the ESLint rule from the design-tokens-branding plan fires here, add `layout.tsx`'s mask block to that rule's accepted exceptions rather than reverting to a flat color.)

- [ ] **Step 2: Visual check**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/smaran run dev
```
Confirm: sidebar mark is now a solid violet icon, clearly visible against `bg-sidebar`, sized proportionally with the larger wordmark.

- [ ] **Step 3: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/smaran/src/components/layout.tsx
git commit -m "fix(smaran): recolor and enlarge low-contrast sidebar logo mark"
```
