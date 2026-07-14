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

  // Primary button (mint pill): height: 48px, padding: 0 24px, shadow-cta, hover translations
  const button = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center justify-center rounded-pill bg-black px-6 fs-button text-white shadow-cta transition-all duration-200 hover:-translate-y-[1px] hover:bg-zinc-800 active:translate-y-0 cursor-pointer"
    >
      {label}
    </a>
  );

  if (variant !== "hero") {
    return button;
  }

  return (
    <div className="flex flex-col gap-2 text-center lg:text-left items-center lg:items-start">
      {button}
      <p className="fs-body text-text-secondary mt-1">{content.hero.ctaMicrocopy}</p>
    </div>
  );
}
