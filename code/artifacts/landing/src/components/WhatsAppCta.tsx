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
      <div className="hidden items-center gap-4 rounded-2xl bg-white/50 p-2 pr-6 shadow-sm ring-1 ring-black/5 backdrop-blur-sm md:flex">
        <img
          src="/qr-whatsapp.png"
          alt={content.hero.qrCaption}
          className="h-16 w-16 rounded-xl mix-blend-multiply"
        />
        <span className="text-sm font-medium text-foreground/80">
          {content.hero.qrCaption}
        </span>
      </div>
    </div>
  );
}
