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
      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
    >
      {label}
    </a>
  );

  if (variant !== "hero") {
    return button;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      {button}
      <div className="hidden flex-col items-center gap-1 md:flex">
        <img
          src="/qr-whatsapp.png"
          alt={content.hero.qrCaption}
          className="h-28 w-28 rounded-md border border-border"
        />
        <span className="text-xs text-muted-foreground">
          {content.hero.qrCaption}
        </span>
      </div>
    </div>
  );
}
