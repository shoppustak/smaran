import { ShieldCheck } from "lucide-react";

import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function TrustPricing() {
  const { content } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Visual left / text right on desktop — alternates against the hero
            (text left / visual right), giving the page a deliberate rhythm. */}
        <div className="flex flex-col gap-12 lg:flex-row-reverse lg:items-center lg:gap-24">
          <div className="flex flex-1 flex-col justify-center text-center lg:text-left">
            <div className="flex items-center gap-4 mb-6 mx-auto lg:mx-0">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 ring-1 ring-secondary/20 shadow-sm text-secondary">
                <ShieldCheck className="h-7 w-7" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary ring-1 ring-inset ring-secondary/20">
                {content.trust.heading}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {content.trust.statements.map((statement) => (
                <div
                  key={statement}
                  className="flex items-start gap-3 rounded-2xl bg-secondary/5 p-4 text-left"
                >
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed text-foreground">
                    {statement}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full max-w-xl shrink-0 lg:w-[500px] mx-auto lg:mx-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary/5 to-primary/5 ring-1 ring-border/50 flex items-center justify-center p-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
              <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl bg-card p-8 text-center shadow-xl">
                <p className="text-sm font-medium text-foreground">
                  {content.pricing.framingLine}
                </p>
                <p className="text-4xl font-bold tracking-tight text-foreground">
                  {content.pricing.priceLine}
                </p>
                <ul className="flex flex-col gap-1.5 text-sm font-normal text-foreground">
                  {content.pricing.includedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <WhatsAppCta variant="card" />
                <p className="text-sm font-normal text-foreground">
                  {content.pricing.fallbackLine}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
