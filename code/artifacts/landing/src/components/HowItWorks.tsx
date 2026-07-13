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
    <section className="relative overflow-hidden">
      {/* Fade-out continuation of the hero's gradient wash — softens the hard seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-secondary/10 to-background"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <h2 className="mb-10 text-center font-serif text-2xl font-medium text-foreground">
          {howItWorks.heading}
        </h2>
      <div className="flex flex-col gap-4">
        {howItWorks.items.map((item, index) => {
          const Icon = ICONS[item.icon];
          const badgeClass =
            index % 2 === 0
              ? "bg-primary/10 text-primary"
              : "bg-secondary/10 text-secondary";
          return (
            <div
              key={item.label}
              className="flex items-start gap-4 rounded-xl border border-card-border bg-card p-6 shadow-sm"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${badgeClass}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {item.label}
                </h3>
                <p className="mt-1 text-muted-foreground">{item.body}</p>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
