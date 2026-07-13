import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Footer() {
  const { content } = useLanguage();
  const { footer } = content;

  return (
    <footer className="relative overflow-hidden bg-foreground px-6 py-20 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20"
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <WhatsAppCta variant="footer" />
        <p className="font-serif text-lg text-background">
          {footer.successionLine}
        </p>
        <p className="text-xs text-background/60">{footer.privacyLine}</p>
        <p className="text-xs text-background/60">{footer.copyright}</p>
      </div>
    </footer>
  );
}
