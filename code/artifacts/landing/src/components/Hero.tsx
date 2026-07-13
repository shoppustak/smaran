import {
  BellRing,
  HeartHandshake,
  IndianRupee,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";
import type { HowItWorksIcon } from "@/types";

const ICONS: Record<HowItWorksIcon, LucideIcon> = {
  "bell-ring": BellRing,
  "heart-handshake": HeartHandshake,
  "shield-check": ShieldCheck,
  "indian-rupee": IndianRupee,
};

export function Hero() {
  const { content } = useLanguage();
  const { hero } = content;
  const [illustrationFailed, setIllustrationFailed] = useState(false);
  const [first, second, third, fourth] = content.howItWorks.items;

  return (
    <header className="relative overflow-hidden bg-background">
      {/* Full-bleed photo — bleeds to the true right edge of the viewport,
          ignoring the max-w-7xl content constraint. Desktop only. */}
      <div className="pointer-events-none absolute bottom-0 right-0 top-32 hidden w-[52%] lg:block">
        {!illustrationFailed && (
          <img
            src="/purohit-photo.png"
            alt=""
            aria-hidden="true"
            onError={() => setIllustrationFailed(true)}
            className="h-full w-full object-cover object-[65%_25%]"
          />
        )}
        {first && (
          <div className="pointer-events-auto absolute left-6 top-10 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
            <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {first.label}
            </span>
          </div>
        )}
        {second && (
          <div className="pointer-events-auto absolute right-10 top-1/4 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
            <HeartHandshake className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {second.label}
            </span>
          </div>
        )}
        {third && (
          <div className="pointer-events-auto absolute bottom-16 left-10 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {third.label}
            </span>
          </div>
        )}
        {fourth && (
          <div className="pointer-events-auto absolute bottom-6 right-10 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
            <IndianRupee className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {fourth.label}
            </span>
          </div>
        )}
        {/* Fade the photo's left and top edges into the page background so
            the bleed doesn't end in hard seams. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent"
        />
      </div>

      {/* Full-width Top Navigation — single logo lockup image */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8 sm:px-8 sm:py-10">
        <img
          src="/logo-lockup.png"
          alt={hero.wordmarkDevanagari}
          className="h-12 w-auto sm:h-14"
        />
        <LanguageToggle />
      </div>

      {/* Text column only — essential height, no forced min-height. The
          photo bleeds separately behind/beside this on desktop. */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-6 pb-10 pt-2 text-center lg:items-start lg:pb-14 lg:text-left">
        <div className="flex w-full flex-col items-center text-center lg:max-w-[48%] lg:items-start lg:text-left">
          <p className="max-w-xl text-2xl font-medium leading-snug text-foreground sm:text-3xl">
            {hero.headlinePrefix}
            <span className="text-primary italic">{hero.headlineEmphasis}</span>
            {hero.headlineSuffix}
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-foreground sm:text-lg">
            {hero.subline}
          </p>

          <div className="mt-6 flex w-full justify-center lg:justify-start">
            <WhatsAppCta variant="hero" />
          </div>

          {/* Compact quick-link row — feature summary pulled above the fold */}
          <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:max-w-md">
            {content.howItWorks.items.map((item, index) => {
              const Icon = ICONS[item.icon];
              const accent =
                index % 2 === 0
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary/10 text-secondary";
              const tint = index % 2 === 0 ? "bg-primary/5" : "bg-secondary/5";
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${tint}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
