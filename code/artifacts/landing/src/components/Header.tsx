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
            src="/smaran-logo-origami.png"
            alt={content.hero.wordmarkDevanagari}
            className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
          />
          <span className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-[#B6A8FF] to-[#FFB58A] bg-clip-text text-transparent">
            {content.hero.wordmarkDevanagari}
          </span>
        </a>
        <div className="flex items-center gap-6">
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
