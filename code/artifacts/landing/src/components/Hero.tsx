import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Hero() {
  const { content } = useLanguage();
  const { hero } = content;

  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary via-secondary to-primary opacity-20 blur-3xl"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-20 pt-12 text-center">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start">
            <span className="font-serif text-2xl text-primary">
              {hero.wordmarkDevanagari}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {hero.wordmarkLatin}
            </span>
          </div>
          <LanguageToggle />
        </div>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          {hero.headlinePrefix}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {hero.headlineEmphasis}
          </span>
          {hero.headlineSuffix}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{hero.subline}</p>
        <WhatsAppCta variant="hero" />
        <p className="text-sm text-muted-foreground">{hero.ctaMicrocopy}</p>
      </div>
    </header>
  );
}
