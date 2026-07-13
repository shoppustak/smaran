import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Footer() {
  const { content } = useLanguage();
  const { footer } = content;

  return (
    <footer className="border-t border-border px-6 py-16 text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <WhatsAppCta variant="footer" />
        <p className="font-serif text-lg text-foreground">
          {footer.successionLine}
        </p>
        <p className="text-xs text-muted-foreground">{footer.privacyLine}</p>
        <p className="text-xs text-muted-foreground">{footer.copyright}</p>
      </div>
    </footer>
  );
}
