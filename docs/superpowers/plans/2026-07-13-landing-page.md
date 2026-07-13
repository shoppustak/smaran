# Smaran Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, bilingual (Hindi-default/English-toggle) marketing landing page for Smaran — a new `code/artifacts/landing` app whose only job is getting a purohit to tap a WhatsApp CTA that opens the bot's onboarding.

**Architecture:** New Vite + React + TypeScript app, same shape as `code/artifacts/smaran`/`code/artifacts/mockup-sandbox` (Tailwind v4 CSS-first `@theme`, consumes `@workspace/design-tokens`). Fully static — no backend, no auth, no data layer. Content lives in two typed modules (`content/hi.ts`/`content/en.ts`) behind a `LanguageContext`; components are pure presentation and read all copy from context.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@workspace/design-tokens` (workspace package), `lucide-react` icons.

## Global Constraints

- `code/` is a separate pnpm workspace from the outer repo root (see `/Users/maulik/smaran/CLAUDE.md`) — every file this plan touches lives under `code/artifacts/landing/`. The app is auto-discovered by the existing `artifacts/*` glob in `code/pnpm-workspace.yaml` — no workspace config changes needed.
- **Do not edit `code/lib/design-tokens`** — its palette/font rewrite is a separate, concurrently-implemented plan (`docs/superpowers/plans/2026-07-13-tango-design-tokens.md`). This app consumes `@workspace/design-tokens` as an external dependency (violet primary `262 83% 58%`, terracotta secondary `16 75% 55%`, Inter sans, Playfair Display serif) — whatever values that package resolves to at build time.
- Hindi is the **default** language; the toggle button's label is the language you switch *to* (reads "EN" in Hindi mode, "हिं" in English mode).
- One WhatsApp number for every CTA on the page: `15551363612` (test number, per `docs/superpowers/specs/2026-07-13-landing-page-design.md`) — stored once in `src/config.ts`, never hardcoded in a component.
- wa.me pre-filled message is language-aware: `नमस्ते स्मरण` in Hindi mode, `Hi Smaran` in English mode — read from the active language's content module, not a special case.
- QR code: visible only at `≥768px` viewport, paired with the hero CTA button only (not the pricing-card or footer CTA, which are button-only at every width).
- Copy is fixed by the approved spec — reproduce it verbatim (Hindi source, English translation, aap-form register, no exclamation marks, no startup vocabulary, "commission"/"कमीशन" appears only beside "no"/"नहीं").
- No test framework exists for `smaran`/`mockup-sandbox` in this workspace — same pattern here: typecheck + build + manual visual QA, not unit tests.
- No `lint` script and no `code/eslint.config.mjs` changes — out of scope for this plan.

---

### Task 1: Scaffold the `landing` app

**Files:**
- Create: `code/artifacts/landing/package.json`
- Create: `code/artifacts/landing/vite.config.ts`
- Create: `code/artifacts/landing/tsconfig.json`
- Create: `code/artifacts/landing/index.html`
- Create: `code/artifacts/landing/src/main.tsx`
- Create: `code/artifacts/landing/src/App.tsx`
- Create: `code/artifacts/landing/src/index.css`
- Create: `code/artifacts/landing/src/fonts.css`
- Create: `code/artifacts/landing/public/mark-32.png` (copied)
- Create: `code/artifacts/landing/public/mark-180.png` (copied)

**Interfaces:**
- Produces: a runnable, typecheckable, buildable empty app — the shell every later task adds content to.

- [ ] **Step 1: Create the package manifest**

`code/artifacts/landing/package.json`:
```json
{
  "name": "@workspace/landing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "catalog:",
    "@replit/vite-plugin-dev-banner": "catalog:",
    "@replit/vite-plugin-runtime-error-modal": "catalog:",
    "@tailwindcss/vite": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "@workspace/design-tokens": "workspace:*",
    "lucide-react": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "tailwindcss": "catalog:",
    "vite": "catalog:"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

`code/artifacts/landing/vite.config.ts` (mirrors `code/artifacts/smaran/vite.config.ts`, minus the `@assets` alias, which this app doesn't need):
```ts
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

`code/artifacts/landing/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "noEmit": true,
    "jsx": "preserve",
    "lib": ["esnext", "dom", "dom.iterable"],
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 4: Create `index.html`**

`code/artifacts/landing/index.html`:
```html
<!DOCTYPE html>
<html lang="hi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>स्मरण — Smaran</title>
    <meta name="description" content="स्मरण — पुरोहितों के लिए WhatsApp पर बही खाता, तिथि स्मरण और दक्षिणा। Smaran — a WhatsApp ledger and reminder tool for purohits." />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="स्मरण — Smaran" />
    <meta property="og:description" content="आपका बही खाता — अब खुद याद रखता है। WhatsApp पर शुरू करें।" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="स्मरण — Smaran" />
    <meta name="twitter:description" content="आपका बही खाता — अब खुद याद रखता है।" />
    <link rel="icon" type="image/png" sizes="32x32" href="/mark-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/mark-180.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Copy the favicon marks from `smaran`**

```bash
cd /Users/maulik/smaran/code
mkdir -p artifacts/landing/public
cp artifacts/smaran/public/mark-32.png artifacts/landing/public/mark-32.png
cp artifacts/smaran/public/mark-180.png artifacts/landing/public/mark-180.png
```

- [ ] **Step 6: Create `src/fonts.css`**

`code/artifacts/landing/src/fonts.css` (Devanagari-capable body font, paired with Inter — landing-local, not added to the shared `@workspace/design-tokens` package since `smaran`/`mockup-sandbox` don't need Devanagari):
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
```

- [ ] **Step 7: Create `src/index.css`**

`code/artifacts/landing/src/index.css`:
```css
@import "tailwindcss";
@import "@workspace/design-tokens/fonts.css";
@import "@workspace/design-tokens/tokens.css";
@import "./fonts.css";

:root {
  /* Local override, scoped to this app only — appends a Devanagari-capable
     fallback ahead of the shared package's generic sans-serif fallback.
     Does not modify @workspace/design-tokens. */
  --app-font-sans: 'Inter', 'Noto Sans Devanagari', sans-serif;
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
  }
}
```

- [ ] **Step 8: Create `src/main.tsx`**

`code/artifacts/landing/src/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 9: Create a minimal `src/App.tsx`**

`code/artifacts/landing/src/App.tsx` (placeholder content — replaced incrementally by Tasks 2-8):
```tsx
function App() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
      <p className="font-serif text-3xl">स्मरण</p>
    </div>
  );
}

export default App;
```

- [ ] **Step 10: Install and verify the app resolves in the workspace**

```bash
cd /Users/maulik/smaran/code
pnpm install
pnpm list -r --depth -1 | grep landing
```
Expected output: `@workspace/landing@0.0.0` (path `artifacts/landing`).

- [ ] **Step 11: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed with no errors.

- [ ] **Step 12: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed local URL. Expected: a centered "स्मरण" heading on a white background (background/foreground tokens resolving correctly from `@workspace/design-tokens`). Stop the server (Ctrl-C).

- [ ] **Step 13: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing
git commit -m "feat(landing): scaffold new landing page app"
```

---

### Task 2: Content modules, i18n context, language toggle

**Files:**
- Create: `code/artifacts/landing/src/types.ts`
- Create: `code/artifacts/landing/src/content/hi.ts`
- Create: `code/artifacts/landing/src/content/en.ts`
- Create: `code/artifacts/landing/src/config.ts`
- Create: `code/artifacts/landing/src/context/LanguageContext.tsx`
- Create: `code/artifacts/landing/src/components/LanguageToggle.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks beyond the app shell (Task 1).
- Produces: `LandingContent` interface, `hiContent`/`enContent` objects, `useLanguage()` hook returning `{ lang: "hi" | "en", content: LandingContent, toggle: () => void }`, `buildWhatsAppLink(message: string): string` — all consumed by every later task.

- [ ] **Step 1: Create the content type**

`code/artifacts/landing/src/types.ts`:
```ts
export type HowItWorksIcon =
  | "bell-ring"
  | "heart-handshake"
  | "shield-check"
  | "indian-rupee";

export interface HowItWorksItem {
  icon: HowItWorksIcon;
  label: string;
  body: string;
}

export interface LandingContent {
  lang: "hi" | "en";
  /** Label shown on the toggle button — the language you switch TO. */
  toggleLabel: string;
  /** Pre-filled wa.me message text, same across every CTA on the page. */
  whatsAppMessage: string;
  hero: {
    wordmarkDevanagari: string;
    wordmarkLatin: string;
    headlinePrefix: string;
    headlineEmphasis: string;
    headlineSuffix: string;
    subline: string;
    ctaLabel: string;
    ctaMicrocopy: string;
    qrCaption: string;
  };
  howItWorks: {
    heading: string;
    items: HowItWorksItem[];
  };
  trust: {
    heading: string;
    statements: string[];
  };
  pricing: {
    framingLine: string;
    priceLine: string;
    earlyBirdLine: string;
    includedItems: string[];
    ctaLabel: string;
    fallbackLine: string;
  };
  footer: {
    ctaLabel: string;
    successionLine: string;
    privacyLine: string;
    copyright: string;
  };
}
```

- [ ] **Step 2: Create the Hindi content module**

`code/artifacts/landing/src/content/hi.ts` (copy reproduced verbatim from `docs/superpowers/specs/2026-07-13-landing-page-design.md` §1-§5):
```ts
import type { LandingContent } from "@/types";

export const hiContent: LandingContent = {
  lang: "hi",
  toggleLabel: "EN",
  whatsAppMessage: "नमस्ते स्मरण",
  hero: {
    wordmarkDevanagari: "स्मरण",
    wordmarkLatin: "Smaran",
    headlinePrefix: "आपका बही खाता — अब खुद ",
    headlineEmphasis: "याद",
    headlineSuffix: " रखता है",
    subline:
      "हर परिवार की तिथि, समय से पहले, WhatsApp पर — हमेशा आपके ही नाम से।",
    ctaLabel: "WhatsApp पर शुरू करें",
    ctaMicrocopy: "कोई app नहीं। कोई form नहीं। सीधे आपके WhatsApp पर।",
    qrCaption: "फ़ोन से scan करें",
  },
  howItWorks: {
    heading: "स्मरण आपके लिए क्या करता है",
    items: [
      {
        icon: "bell-ring",
        label: "तिथि स्मरण",
        body: "हर परिवार की तिथि — श्राद्ध, कथा, जन्मदिन — पंचांग से मिलाकर, समय से पहले आपको याद दिला दी जाती है।",
      },
      {
        icon: "heart-handshake",
        label: "पुनः सम्पर्क",
        body: "जो यजमान चुप हो गए हैं, स्मरण आपको बताता है — और आपके नाम से आदरपूर्वक नमस्कार भेजने में सहायता करता है।",
      },
      {
        icon: "shield-check",
        label: "मुहूर्त सुरक्षा",
        body: "त्योहार के मौसम में एक ही मुहूर्त पर दो बुकिंग? स्मरण पहले ही सचेत कर देता है।",
      },
      {
        icon: "indian-rupee",
        label: "दक्षिणा, सम्मान सहित",
        body: "पूजा के उपरान्त परिवार को धन्यवाद-कार्ड जाता है — दक्षिणा सीधे आपके अपने UPI में। कोई कमीशन नहीं, कभी नहीं।",
      },
    ],
  },
  trust: {
    heading: "हमारा वचन",
    statements: [
      "यह कोई marketplace नहीं है — आपके यजमान केवल आपके हैं, और केवल आपको ही देखते हैं।",
      "दक्षिणा सीधे आपके UPI में — बीच में कोई नहीं।",
      "आपका बही खाता आपकी विरासत है — हर परिवार, हर गोत्र, हर तिथि, अगली पीढ़ी के लिए वैसे ही सुरक्षित।",
    ],
  },
  pricing: {
    framingLine: "एक लौटा हुआ यजमान — कई वर्षों के शुल्क के बराबर।",
    priceLine: "₹1,499 / वर्ष",
    earlyBirdLine: "आपके क्षेत्र के पहले पुरोहितों के लिए — ₹999 / वर्ष",
    includedItems: [
      "असीमित परिवार और तिथियाँ",
      "WhatsApp पर सब कुछ",
      "पहले आज़माएँ, फिर निर्णय लें",
    ],
    ctaLabel: "WhatsApp पर शुरू करें",
    fallbackLine: "मासिक ₹149 की सुविधा भी उपलब्ध है।",
  },
  footer: {
    ctaLabel: "WhatsApp पर शुरू करें",
    successionLine: "स्मरण — ताकि आपकी स्मृति, आपकी परम्परा बने।",
    privacyLine:
      "आपके परिवारों की जानकारी केवल आपकी है — कभी बेची नहीं जाएगी, और माँगते ही हटा दी जाएगी।",
    copyright: "© स्मरण",
  },
};
```

- [ ] **Step 3: Create the English content module**

`code/artifacts/landing/src/content/en.ts`:
```ts
import type { LandingContent } from "@/types";

export const enContent: LandingContent = {
  lang: "en",
  toggleLabel: "हिं",
  whatsAppMessage: "Hi Smaran",
  hero: {
    wordmarkDevanagari: "स्मरण",
    wordmarkLatin: "Smaran",
    headlinePrefix: "Your bahi khata — now it ",
    headlineEmphasis: "remembers",
    headlineSuffix: " for you",
    subline:
      "Every family's tithi, reminded ahead of time, on WhatsApp — always in your name.",
    ctaLabel: "Start on WhatsApp",
    ctaMicrocopy: "No app. No forms. Straight on your WhatsApp.",
    qrCaption: "Scan with your phone",
  },
  howItWorks: {
    heading: "What Smaran does for you",
    items: [
      {
        icon: "bell-ring",
        label: "Tithi reminders",
        body: "Every family's dates — shraddh, katha, birthdays — matched to the panchang and brought to you ahead of time.",
      },
      {
        icon: "heart-handshake",
        label: "Reconnect",
        body: "Smaran notices the families who have gone quiet — and helps you send a respectful namaskar, in your name.",
      },
      {
        icon: "shield-check",
        label: "Muhurat protection",
        body: "Two bookings in the same muhurat at festival time? Smaran warns you before it happens.",
      },
      {
        icon: "indian-rupee",
        label: "Dakshina, with dignity",
        body: "After the ritual, the family receives a gratitude card — dakshina goes straight to your own UPI. No commission, ever.",
      },
    ],
  },
  trust: {
    heading: "Our word",
    statements: [
      "This is not a marketplace — your yajmans are yours alone, and they see only you.",
      "Dakshina goes straight to your UPI — no one in between.",
      "Your bahi khata is your legacy — every family, every gotra, every tithi, kept intact for the next generation.",
    ],
  },
  pricing: {
    framingLine: "One returned yajman covers years of the fee.",
    priceLine: "₹1,499 / year",
    earlyBirdLine: "For the first purohits of your area — ₹999 / year",
    includedItems: [
      "Unlimited families and tithis",
      "Everything on WhatsApp",
      "Try first, decide later",
    ],
    ctaLabel: "Start on WhatsApp",
    fallbackLine: "A monthly plan at ₹149 is also available.",
  },
  footer: {
    ctaLabel: "Start on WhatsApp",
    successionLine: "Smaran — so that your memory becomes your tradition.",
    privacyLine:
      "Your families' information is yours alone — never sold, and deleted the moment you ask.",
    copyright: "© स्मरण",
  },
};
```

- [ ] **Step 4: Create `src/config.ts`**

`code/artifacts/landing/src/config.ts`:
```ts
/** Test WhatsApp API number — swap for the production/staging number when available. */
export const WHATSAPP_NUMBER = "15551363612";

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 5: Create the language context**

`code/artifacts/landing/src/context/LanguageContext.tsx`:
```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { enContent } from "@/content/en";
import { hiContent } from "@/content/hi";
import type { LandingContent } from "@/types";

type Lang = "hi" | "en";

const STORAGE_KEY = "smaran-landing-lang";

interface LanguageContextValue {
  lang: Lang;
  content: LandingContent;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") {
    return "hi";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "hi";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const toggle = () => {
    setLang((current) => (current === "hi" ? "en" : "hi"));
  };

  const content = lang === "hi" ? hiContent : enContent;

  return (
    <LanguageContext.Provider value={{ lang, content, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
```

- [ ] **Step 6: Create the language toggle component**

`code/artifacts/landing/src/components/LanguageToggle.tsx`:
```tsx
import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle() {
  const { content, toggle } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-border px-3 py-1 text-sm font-medium text-foreground hover:bg-accent"
    >
      {content.toggleLabel}
    </button>
  );
}
```

- [ ] **Step 7: Wire the provider and toggle into `App.tsx`**

Replace `code/artifacts/landing/src/App.tsx`:
```tsx
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

function AppContent() {
  const { content } = useLanguage();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex items-center gap-4">
        <p className="font-serif text-3xl">{content.hero.wordmarkDevanagari}</p>
        <LanguageToggle />
      </div>
      <p>{content.hero.headlinePrefix + content.hero.headlineEmphasis + content.hero.headlineSuffix}</p>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
```
(Intermediate wiring — replaced by the real `<Hero>` component in Task 4.)

- [ ] **Step 8: Typecheck**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
```
Expected: succeeds — this is the mechanism that catches a field present in `hiContent` but missing/mistyped in `enContent` (both must satisfy `LandingContent`).

- [ ] **Step 9: Visual check — toggle actually flips content**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: Hindi headline + wordmark shown by default, a button reading "EN". Click it: content switches to the English headline, button now reads "हिं". Reload the page: language choice persists (localStorage). Stop the server (Ctrl-C).

- [ ] **Step 10: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/types.ts code/artifacts/landing/src/content \
  code/artifacts/landing/src/config.ts code/artifacts/landing/src/context \
  code/artifacts/landing/src/components/LanguageToggle.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add bilingual content modules, language context, toggle"
```

---

### Task 3: WhatsApp CTA component + QR asset

**Files:**
- Create: `code/artifacts/landing/scripts/generate-qr.mjs`
- Create: `code/artifacts/landing/public/qr-whatsapp.png` (generated)
- Create: `code/artifacts/landing/src/components/WhatsAppCta.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`
- Modify: `code/artifacts/landing/package.json`

**Interfaces:**
- Consumes: `useLanguage()`, `buildWhatsAppLink()` (Task 2).
- Produces: `<WhatsAppCta variant="hero" | "card" | "footer" />`, consumed by Tasks 4, 7, 8.

- [ ] **Step 1: Add the `qrcode` package for one-off asset generation**

In `code/artifacts/landing/package.json`, add to `devDependencies` (alphabetical position):
```json
    "qrcode": "^1.5.4",
```

```bash
cd /Users/maulik/smaran/code
pnpm install
```

- [ ] **Step 2: Write the QR generation script**

`code/artifacts/landing/scripts/generate-qr.mjs` (one-off, not run by the build — generates a committed static asset; the WhatsApp number/message are duplicated from `src/config.ts`/`src/content/hi.ts` here since this is a plain Node script outside the Vite/TS build — if the test number changes, update both this script and `src/config.ts`, then re-run):
```js
import path from "node:path";
import { fileURLToPath } from "node:url";

import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WHATSAPP_NUMBER = "15551363612";
const MESSAGE = "नमस्ते स्मरण";
const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

const outPath = path.resolve(__dirname, "..", "public", "qr-whatsapp.png");

await QRCode.toFile(outPath, url, {
  width: 512,
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
});

console.log(`QR code written to ${outPath} for ${url}`);
```

- [ ] **Step 3: Run it once, commit the output as a static asset**

```bash
cd /Users/maulik/smaran/code/artifacts/landing
node scripts/generate-qr.mjs
```
Expected output: `QR code written to .../public/qr-whatsapp.png for https://wa.me/15551363612?text=...`

```bash
file /Users/maulik/smaran/code/artifacts/landing/public/qr-whatsapp.png
```
Expected: `PNG image data, 512 x 512, ...`

- [ ] **Step 4: Create the `WhatsAppCta` component**

`code/artifacts/landing/src/components/WhatsAppCta.tsx`:
```tsx
import { buildWhatsAppLink } from "@/config";
import { useLanguage } from "@/context/LanguageContext";

interface WhatsAppCtaProps {
  variant: "hero" | "card" | "footer";
}

export function WhatsAppCta({ variant }: WhatsAppCtaProps) {
  const { content } = useLanguage();
  const href = buildWhatsAppLink(content.whatsAppMessage);

  const label =
    variant === "hero"
      ? content.hero.ctaLabel
      : variant === "card"
        ? content.pricing.ctaLabel
        : content.footer.ctaLabel;

  const button = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
    >
      {label}
    </a>
  );

  if (variant !== "hero") {
    return button;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      {button}
      <div className="hidden flex-col items-center gap-1 md:flex">
        <img
          src="/qr-whatsapp.png"
          alt={content.hero.qrCaption}
          className="h-28 w-28 rounded-md border border-border"
        />
        <span className="text-xs text-muted-foreground">
          {content.hero.qrCaption}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render it in `App.tsx` (temporary wiring)**

In `code/artifacts/landing/src/App.tsx`, add the import and render it below the existing content:
```tsx
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";

function AppContent() {
  const { content } = useLanguage();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex items-center gap-4">
        <p className="font-serif text-3xl">{content.hero.wordmarkDevanagari}</p>
        <LanguageToggle />
      </div>
      <p>{content.hero.headlinePrefix + content.hero.headlineEmphasis + content.hero.headlineSuffix}</p>
      <WhatsAppCta variant="hero" />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 6: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
ls artifacts/landing/dist/qr-whatsapp.png
```
Expected: typecheck and build succeed, and the QR asset is present in the build output.

- [ ] **Step 7: Visual check — QR responsive breakpoint**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL at a wide window (`≥768px`): expected the WhatsApp button AND the QR code side-by-side. Resize the browser to `<768px` (or use device emulation): expected the QR code disappears, button remains. Tap/click the button: expected it opens `https://wa.me/15551363612?text=...` in a new tab (or shows the intended URL — actual WhatsApp Web/app behavior depends on the environment). Stop the server (Ctrl-C).

- [ ] **Step 8: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/scripts code/artifacts/landing/public/qr-whatsapp.png \
  code/artifacts/landing/src/components/WhatsAppCta.tsx code/artifacts/landing/src/App.tsx \
  code/artifacts/landing/package.json code/pnpm-lock.yaml
git commit -m "feat(landing): add WhatsApp CTA component with responsive QR code"
```

---

### Task 4: Hero component

**Files:**
- Create: `code/artifacts/landing/src/components/Hero.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (Task 2), `<LanguageToggle>` (Task 2), `<WhatsAppCta variant="hero">` (Task 3).
- Produces: `<Hero />`, consumed by Task 9's `App.tsx` assembly.

- [ ] **Step 1: Create the Hero component**

`code/artifacts/landing/src/components/Hero.tsx` (gradient blob + gradient headline word use only `--primary`/`--secondary` tokens — no new colors invented, per the "closely follow Tango" instruction):
```tsx
import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Hero() {
  const { content } = useLanguage();
  const { hero } = content;

  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary via-secondary to-primary opacity-20 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-12 text-center">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start">
            <span className="font-serif text-2xl text-primary">
              {hero.wordmarkDevanagari}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {hero.wordmarkLatin}
            </span>
          </div>
          <LanguageToggle />
        </div>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          {hero.headlinePrefix}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {hero.headlineEmphasis}
          </span>
          {hero.headlineSuffix}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{hero.subline}</p>
        <WhatsAppCta variant="hero" />
        <p className="text-sm text-muted-foreground">{hero.ctaMicrocopy}</p>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Replace `App.tsx`'s ad-hoc content with `<Hero>`**

`code/artifacts/landing/src/App.tsx`:
```tsx
import { Hero } from "@/components/Hero";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
      </div>
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed.

- [ ] **Step 4: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: full hero — wordmark + toggle top row, soft blurred gradient blob behind the headline, headline with "याद" (or "remembers" in EN) rendered as a violet-to-terracotta gradient, subline, WhatsApp button + QR (≥768px), microcopy below. Toggle language, confirm every string updates. Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/components/Hero.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add Hero section"
```

---

### Task 5: How-it-works section

**Files:**
- Create: `code/artifacts/landing/src/components/HowItWorks.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (Task 2), `HowItWorksItem`/`HowItWorksIcon` types (Task 2).
- Produces: `<HowItWorks />`, consumed by Task 9's `App.tsx` assembly.

- [ ] **Step 1: Create the component**

`code/artifacts/landing/src/components/HowItWorks.tsx`:
```tsx
import {
  BellRing,
  HeartHandshake,
  IndianRupee,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import type { HowItWorksIcon } from "@/types";

const ICONS: Record<HowItWorksIcon, LucideIcon> = {
  "bell-ring": BellRing,
  "heart-handshake": HeartHandshake,
  "shield-check": ShieldCheck,
  "indian-rupee": IndianRupee,
};

export function HowItWorks() {
  const { content } = useLanguage();
  const { howItWorks } = content;

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-10 text-center font-serif text-2xl font-medium text-foreground">
        {howItWorks.heading}
      </h2>
      <div className="flex flex-col gap-8">
        {howItWorks.items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.label} className="flex items-start gap-4">
              <Icon
                className="mt-1 h-6 w-6 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.label}
                </h3>
                <p className="text-muted-foreground">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add it to `App.tsx`**

`code/artifacts/landing/src/App.tsx`:
```tsx
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
      </div>
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed.

- [ ] **Step 4: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: below the hero, 4 stacked items each with a violet icon, bold label, and one-line description ("तिथि स्मरण" / "Tithi reminders" first). Toggle language, confirm labels/bodies switch. Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/components/HowItWorks.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add How It Works section"
```

---

### Task 6: Trust row section

**Files:**
- Create: `code/artifacts/landing/src/components/TrustRow.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (Task 2).
- Produces: `<TrustRow />`, consumed by Task 9's `App.tsx` assembly.

- [ ] **Step 1: Create the component**

`code/artifacts/landing/src/components/TrustRow.tsx`:
```tsx
import { useLanguage } from "@/context/LanguageContext";

export function TrustRow() {
  const { content } = useLanguage();
  const { trust } = content;

  return (
    <section className="bg-muted py-16">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-8 text-center font-serif text-2xl font-medium text-foreground">
          {trust.heading}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {trust.statements.map((statement) => (
            <li key={statement} className="text-center text-sm text-foreground">
              {statement}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add it to `App.tsx`**

`code/artifacts/landing/src/App.tsx`:
```tsx
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { TrustRow } from "@/components/TrustRow";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
        <TrustRow />
      </div>
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed.

- [ ] **Step 4: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: a muted-background band with "हमारा वचन" ("Our word") heading and 3 statements in a row (stacked on narrow viewports via the `sm:grid-cols-3` breakpoint). Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/components/TrustRow.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add Trust Row section"
```

---

### Task 7: Pricing card section

**Files:**
- Create: `code/artifacts/landing/src/components/PricingCard.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (Task 2), `<WhatsAppCta variant="card">` (Task 3).
- Produces: `<PricingCard />`, consumed by Task 9's `App.tsx` assembly.

- [ ] **Step 1: Create the component**

`code/artifacts/landing/src/components/PricingCard.tsx`:
```tsx
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function PricingCard() {
  const { content } = useLanguage();
  const { pricing } = content;

  return (
    <section className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="mb-6 text-muted-foreground">{pricing.framingLine}</p>
      <div className="rounded-2xl border border-card-border bg-card p-8 shadow-sm">
        <p className="text-3xl font-semibold text-foreground">
          {pricing.priceLine}
        </p>
        <p className="mt-1 text-secondary">{pricing.earlyBirdLine}</p>
        <ul className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
          {pricing.includedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <WhatsAppCta variant="card" />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {pricing.fallbackLine}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Add it to `App.tsx`**

`code/artifacts/landing/src/App.tsx`:
```tsx
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PricingCard } from "@/components/PricingCard";
import { TrustRow } from "@/components/TrustRow";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
        <TrustRow />
        <PricingCard />
      </div>
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed.

- [ ] **Step 4: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: single pricing card, "₹1,499 / वर्ष" with the ₹999 early-bird line beneath in terracotta, 3 included-items, WhatsApp button, monthly-fallback line below the card. Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/components/PricingCard.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add Pricing card section"
```

---

### Task 8: Footer section

**Files:**
- Create: `code/artifacts/landing/src/components/Footer.tsx`
- Modify: `code/artifacts/landing/src/App.tsx`

**Interfaces:**
- Consumes: `useLanguage()` (Task 2), `<WhatsAppCta variant="footer">` (Task 3).
- Produces: `<Footer />`, consumed by Task 9's `App.tsx` assembly. This is the final section — the page is complete after this task.

- [ ] **Step 1: Create the component**

`code/artifacts/landing/src/components/Footer.tsx`:
```tsx
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Footer() {
  const { content } = useLanguage();
  const { footer } = content;

  return (
    <footer className="border-t border-border px-6 py-16 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <WhatsAppCta variant="footer" />
        <p className="font-serif text-lg text-foreground">
          {footer.successionLine}
        </p>
        <p className="text-xs text-muted-foreground">{footer.privacyLine}</p>
        <p className="text-xs text-muted-foreground">{footer.copyright}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Add it to `App.tsx` — this completes the page**

`code/artifacts/landing/src/App.tsx`:
```tsx
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PricingCard } from "@/components/PricingCard";
import { TrustRow } from "@/components/TrustRow";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
        <TrustRow />
        <PricingCard />
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck and build**

```bash
cd /Users/maulik/smaran/code
pnpm --filter @workspace/landing run typecheck
pnpm --filter @workspace/landing run build
```
Expected: both succeed.

- [ ] **Step 4: Visual check**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL. Expected: footer with WhatsApp button (no QR — hero-only asset per spec), succession line, privacy line, "© स्मरण". Stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
cd /Users/maulik/smaran
git add code/artifacts/landing/src/components/Footer.tsx code/artifacts/landing/src/App.tsx
git commit -m "feat(landing): add Footer section — page complete"
```

---

### Task 9: Full page verification

**Files:** none (verification only).

- [ ] **Step 1: Full workspace typecheck**

```bash
cd /Users/maulik/smaran/code
pnpm run typecheck
```
Expected: succeeds — this runs `landing`'s typecheck alongside every other workspace package (picked up automatically by the root `typecheck` script's `./artifacts/**` filter).

- [ ] **Step 2: Full workspace build**

```bash
cd /Users/maulik/smaran/code
pnpm run build
```
Expected: succeeds — builds `landing` alongside `smaran`, `mockup-sandbox`, `api-server`.

- [ ] **Step 3: Bilingual manual QA — Hindi (default)**

```bash
cd /Users/maulik/smaran/code
PORT=5199 BASE_PATH=/ pnpm --filter @workspace/landing run dev
```
Open the printed URL in a fresh private/incognito window (no stored language preference). Confirm, top to bottom, in Hindi:
- Hero: स्मरण wordmark, "EN" toggle button, gradient headline with "याद" in violet-to-terracotta gradient, subline, WhatsApp button + QR (at ≥768px width), microcopy.
- How it works: 4 items — तिथि स्मरण / पुनः सम्पर्क / मुहूर्त सुरक्षा / दक्षिणा, सम्मान सहित — each with icon and description.
- Trust row: "हमारा वचन" heading, 3 statements.
- Pricing: ₹1,499/वर्ष card with ₹999 early-bird line, 3 included items, WhatsApp button, ₹149/month fallback line.
- Footer: WhatsApp button (no QR), succession line, privacy line, © स्मरण.

- [ ] **Step 4: Bilingual manual QA — English toggle**

In the same open tab, click the "EN" toggle in the hero. Confirm every section above re-renders in English (toggle now reads "हिं"), and reload the page — confirm English persists (localStorage).

- [ ] **Step 5: QR responsive breakpoint check**

With the browser window ≥768px wide, confirm the hero shows the WhatsApp button AND the QR code. Resize to <768px (or use device emulation): confirm the QR code is hidden, button remains. Confirm the pricing-card and footer WhatsApp buttons never show a QR code at any width.

- [ ] **Step 6: wa.me link language-awareness check**

In Hindi mode, inspect (right-click → Inspect, or hover) any WhatsApp button's `href`: expected `https://wa.me/15551363612?text=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87%20%E0%A4%B8%E0%A5%8D%E0%A4%AE%E0%A4%B0%E0%A4%A3` (URL-encoded `नमस्ते स्मरण`). Toggle to English, inspect again: expected `https://wa.me/15551363612?text=Hi%20Smaran`.

Stop the server (Ctrl-C) once all checks pass.

No commit for this task — verification only, no file changes expected.
