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
