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
