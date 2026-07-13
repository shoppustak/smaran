import { buildWhatsAppLink } from "@/config";
import { useLanguage } from "@/context/LanguageContext";

interface WhatsAppCtaProps {
  variant: "hero" | "card" | "footer";
}

export function WhatsAppCta({ variant }: WhatsAppCtaProps) {
  const { content } = useLanguage();
  const href = buildWhatsAppLink(content.whatsAppMessage);

  const label =
    variant === "hero"
      ? content.hero.ctaLabel
      : variant === "card"
        ? content.pricing.ctaLabel
        : content.footer.ctaLabel;

  const button = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"
    >
      {label}
    </a>
  );

  if (variant !== "hero") {
    return button;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
      {button}
    </div>
  );
}
