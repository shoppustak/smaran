import { LanguageToggle } from "@/components/LanguageToggle";
import { buildWhatsAppLink } from "@/config";
import { useLanguage } from "@/context/LanguageContext";

export function Header() {
  const { content } = useLanguage();
  const href = buildWhatsAppLink(content.whatsAppMessage);

  return (
    <header className="w-full bg-transparent border-b border-border/30">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-8">
        <a href="#" className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="Smaran logo mark"
            className="h-10 w-auto sm:h-12 object-contain"
          />
          <img
            src="/wordmark.svg"
            alt={content.hero.wordmarkDevanagari}
            className="h-6 w-auto sm:h-8 object-contain"
          />
        </a>
        <div className="flex items-center gap-6">
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
