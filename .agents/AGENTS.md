# Smaran Agent Rules

## Styling and branding

- **Never hardcode a color** (`#fff`, `rgba(...)`) or use inline `style={{}}` in
  `code/artifacts/smaran/src` or `code/artifacts/mockup-sandbox/src` app code. Use a design
  token / Tailwind utility class instead. Enforced by ESLint (`code/eslint.config.mjs`) once
  `docs/superpowers/plans/2026-07-13-design-tokens-branding.md` has been executed — check that
  plan's status if the lint rule isn't firing yet.
- Exception: vendor shadcn primitives under `src/components/ui/**` in either app — those
  legitimately need inline styles for computed values (chart series colors, progress bar width).

## Product scope

- No marketplace, ratings, search, or discovery of priests/families — ever.
- No consumer web/app UI for the real product — WhatsApp is the interface.
- No payment gateway/PSP, no webhook-driven payment state.
- Full detail: `code/.agents/memory/smaran-product.md`.
