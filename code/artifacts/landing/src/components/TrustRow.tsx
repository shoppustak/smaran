import { UserCheck, Coins, BookOpen, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { WhatsAppCta } from "@/components/WhatsAppCta";

export function TrustRow() {
  const { content } = useLanguage();
  const { trust, pricing } = content;

  // We assign semantic icons to each of the 3 statements
  const icons = [UserCheck, Coins, BookOpen];

  return (
    <section className="bg-background py-12 md:py-16 px-6 relative">
      
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          
          {/* Right Column on Desktop, Top on Mobile: Guarantees (lg:col-span-7) */}
          <div className="flex flex-col lg:col-span-7 order-1 lg:order-2">
            
            {/* Eyebrow / Section Title */}
            <div className="mb-10 text-center lg:text-left">
              <span className="fs-eyebrow tracking-[0.08em] uppercase text-text-secondary font-semibold">
                {trust.heading}
              </span>
            </div>

            {/* Guarantees List */}
            <div className="flex flex-col gap-8">
              {trust.statements.map((statement, index) => {
                const Icon = icons[index] || UserCheck;
                const title = index === 0 ? (content.lang === "hi" ? "स्वतंत्र स्थान" : "Private Space") : 
                              index === 1 ? (content.lang === "hi" ? "सीधी दक्षिणा" : "Direct Dakshina") : 
                              (content.lang === "hi" ? "सुरक्षित विरासत" : "Secure Legacy");
                return (
                  <div 
                    key={index}
                    className="flex items-start text-left gap-4"
                  >
                    {/* Icon in primary brand mint color */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-0.5">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="fs-h3 font-semibold text-foreground mb-1 tracking-tight">
                        {title}
                      </h3>
                      <p className="fs-body text-text-secondary leading-[1.6]">
                        {statement}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Left Column on Desktop, Bottom on Mobile: Pricing Card (lg:col-span-5) */}
          <div className="flex justify-center lg:col-span-5 w-full order-2 lg:order-1 relative">
            
            {/* Layered glowing gradient patches directly behind the pricing card */}
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center scale-95 blur-[80px] opacity-[0.85]" aria-hidden="true">
              <div className="absolute h-56 w-56 rounded-full bg-[#FFB58A] -translate-x-12 -translate-y-6" />
              <div className="absolute h-56 w-56 rounded-full bg-[#FF8AB2] translate-x-12 translate-y-6" />
            </div>

            {/* Pricing Card (radius-lg = 16px, border, shadow-card, padding-24px) */}
            <div className="relative z-10 w-full max-w-[400px] bg-white border border-border rounded-lg shadow-card p-6 md:p-8 flex flex-col items-center text-center">
              
              {/* Eyebrow / Framing Line inside Card */}
              <span className="fs-eyebrow tracking-[0.08em] uppercase text-text-muted font-semibold mb-2">
                {pricing.framingLine}
              </span>

              {/* Main Price */}
              <div className="flex flex-col items-center">
                <span className="fs-h2 text-foreground font-black tracking-tight leading-none">
                  {pricing.priceLine}
                </span>
              </div>

              {/* Founder-tier line */}
              {pricing.earlyBirdLine && (
                <div className="mt-5 w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -mx-6 md:-mx-8 bg-gradient-to-r from-[#FFB58A]/40 to-[#B6A8FF]/40 py-2.5 flex justify-center">
                  <span className="fs-small font-bold text-black px-4 text-center">
                    {pricing.earlyBirdLine}
                  </span>
                </div>
              )}

              {/* Inclusions List (fs-body, compact checkmarks) */}
              <ul className="mt-8 mb-6 flex flex-col gap-4 text-left w-full border-t border-border/60 pt-6">
                {pricing.includedItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 fs-body font-medium text-text-secondary">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary mt-0.5">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* WhatsApp CTA & Fallback */}
              <div className="w-full flex flex-col items-center">
                <span className="fs-body text-text-muted mt-1 leading-none text-center">
                  {pricing.fallbackLine}
                </span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
