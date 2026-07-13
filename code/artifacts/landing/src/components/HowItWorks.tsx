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
