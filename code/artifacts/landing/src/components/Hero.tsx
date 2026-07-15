import {
  BellRing,
  HeartHandshake,
  IndianRupee,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

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
    <section className="relative bg-background pt-8 pb-12 md:pt-10 md:pb-16 px-6">

      <div className="relative z-10 mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          
          {/* Left Column: Text Content and WhatsApp CTA constrained to ~480-520px */}
          <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left lg:max-w-[500px]">
            <h1 className="fs-h2 text-foreground tracking-tight leading-[1.15] text-center lg:text-left">
              {hero.headlinePrefix}
              <span className="inline-block bg-gradient-to-r from-primary via-emerald-500 to-emerald-600 bg-clip-text italic text-transparent">
                {hero.headlineEmphasis}
              </span>
              {hero.headlineSuffix}
            </h1>
            
            <p className="mt-6 fs-body-lg text-text-secondary leading-[1.6]">
              {hero.subline}
            </p>

            <div className="mt-8 flex w-full justify-center lg:justify-start">
              <WhatsAppCta variant="hero" />
            </div>
          </div>

          {/* Right Column: Hero image with horizontal aspect and glowing gradient patch below */}
          <div className="relative flex justify-center lg:col-span-6 w-full">
            
            {/* Layered glowing gradient patches directly behind and below the image */}
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center scale-95 blur-[40px] opacity-[0.95]" aria-hidden="true">
              <div className="absolute -top-8 -left-8 h-44 w-44 rounded-full bg-[#B6A8FF]" />
              <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full bg-[#7CC8FF]" />
              <div className="absolute -bottom-4 -left-4 h-44 w-44 rounded-full bg-[#FFB58A]" />
              <div className="absolute -bottom-8 -right-8 h-44 w-44 rounded-full bg-[#FF8AB2]" />
            </div>

            <div className="relative w-full max-w-[540px] z-10">
              
              {/* Horizontal Image wrapper (aspect-[3/2], no border, rounded corners, shadow-lg) */}
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-zinc-50 shadow-lg">
                {!illustrationFailed && (
                  <img
                    src="/purohit-photo.png"
                    alt="Smaran Purohit"
                    onError={() => setIllustrationFailed(true)}
                    className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
                  />
                )}
                {illustrationFailed && (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                    <span className="text-sm text-text-secondary">Smaran</span>
                  </div>
                )}
              </div>

              {/* Floating Status Pill Badges (radius-sm = 6px, custom status pill bg/text tints) */}
              {first && (
                <div 
                  className="absolute left-[-16px] -top-4 z-20 flex items-center gap-2 rounded-sm px-4 py-2 shadow-md border border-[#1F8C5A]/10 transition-transform duration-300 hover:-translate-y-[1px]"
                  style={{ backgroundColor: "var(--pill-green-bg)", color: "var(--pill-green-fg)" }}
                >
                  <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[12px] font-semibold tracking-wide">
                    {first.label}
                  </span>
                </div>
              )}
              {second && (
                <div 
                  className="absolute right-[-16px] top-[15%] z-20 flex items-center gap-2 rounded-sm px-4 py-2 shadow-md border border-[#2C6BB8]/10 transition-transform duration-300 hover:-translate-y-[1px]"
                  style={{ backgroundColor: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" }}
                >
                  <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[12px] font-semibold tracking-wide">
                    {second.label}
                  </span>
                </div>
              )}
              {third && (
                <div 
                  className="absolute left-[-12px] bottom-12 z-20 flex items-center gap-2 rounded-sm px-4 py-2 shadow-md border border-[#B5631F]/10 transition-transform duration-300 hover:-translate-y-[1px]"
                  style={{ backgroundColor: "var(--pill-orange-bg)", color: "var(--pill-orange-fg)" }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[12px] font-semibold tracking-wide">
                    {third.label}
                  </span>
                </div>
              )}
              {fourth && (
                <div 
                  className="absolute right-[-12px] -bottom-4 z-20 flex items-center gap-2 rounded-sm px-4 py-2 shadow-md border border-[#A87B12]/10 transition-transform duration-300 hover:-translate-y-[1px]"
                  style={{ backgroundColor: "var(--pill-yellow-bg)", color: "var(--pill-yellow-fg)" }}
                >
                  <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[12px] font-semibold tracking-wide">
                    {fourth.label}
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
