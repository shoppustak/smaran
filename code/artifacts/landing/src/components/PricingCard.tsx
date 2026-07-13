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
