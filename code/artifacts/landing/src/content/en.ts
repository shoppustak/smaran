import type { LandingContent } from "@/types";

export const enContent: LandingContent = {
  lang: "en",
  toggleLabel: "हिं",
  whatsAppMessage: "Hi Smaran",
  hero: {
    wordmarkDevanagari: "स्मरण",
    wordmarkLatin: "Smaran",
    headlinePrefix: "Every family's tithi, ",
    headlineEmphasis: "reminded ahead of time.",
    headlineSuffix: "",
    subline:
      "A simple WhatsApp service — built for purohits, for the families they already serve.",
    ctaLabel: "Start on WhatsApp",
    ctaMicrocopy: "No app. No forms.",
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
    framingLine: "One retained yajman covers annual fees",
    priceLine: "₹1,101 / year",
    earlyBirdLine: "For the first 100 purohits of your area — first year ₹501",
    includedItems: [
      "Unlimited families and tithis",
      "Everything on WhatsApp",
      "Try first, decide later",
    ],
    ctaLabel: "Start on WhatsApp",
    fallbackLine: "A monthly plan at ₹151 is also available.",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      {
        question: "Do I need to download an app?",
        answer:
          "No. Smaran works entirely inside WhatsApp — no separate app, no login.",
      },
      {
        question: "Is my families' information safe?",
        answer:
          "Yes. Your information is yours alone — never sold, and you can have it removed anytime.",
      },
      {
        question: "My calendar is purnimanta or amanta — does that matter?",
        answer:
          "Yes, a great deal. We ask this at the start, so a shraddh or tithi date never lands on the wrong fortnight.",
      },
      {
        question: "Is this like a marketplace?",
        answer:
          "No. It's only between you and your own families — no other purohit appears here, no comparison.",
      },
      {
        question: "How does dakshina reach me?",
        answer:
          "After the ritual, the family gets a gratitude card with your own UPI link. The money comes straight to you — Smaran never sits in between.",
      },
    ],
  },
  footer: {
    ctaLabel: "Start on WhatsApp",
    aboutLine:
      "Smaran is a simple WhatsApp service — built for purohits, for the families they already serve. No app, no middleman — just your dates, in your name, on time.",
    privacyLine:
      "Your yajman's information is yours alone - never shared.",
    copyright: "© स्मरण",
    qrHeader: "Scan to start",
    qrSub: "Open in WhatsApp",
  },
};
