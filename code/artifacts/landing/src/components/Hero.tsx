import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Hero() {
  const { content } = useLanguage();
  const { hero } = content;

  return (
    <header className="relative min-h-[90vh] overflow-hidden flex flex-col">
      {/* Tango-style background gradient wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(100%_100%_at_50%_0%,var(--tw-gradient-stops))] from-primary/15 via-secondary/5 to-background"
      />
      
      {/* Full-width Top Navigation */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <img 
            src="/mark-180.png" 
            alt="Logo" 
            className="h-8 w-8 object-contain opacity-90"
            // eslint-disable-next-line no-restricted-syntax
            style={{ filter: "brightness(0) saturate(100%) invert(43%) sepia(85%) saturate(4500%) hue-rotate(245deg) brightness(90%) contrast(105%)" }} 
          />
          <div className="flex flex-col items-start leading-none">
            <span className="font-serif text-2xl font-medium text-primary">
              {hero.wordmarkDevanagari}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
              {hero.wordmarkLatin}
            </span>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* Centered Hero Content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 pb-32 pt-20 text-center sm:pt-32">
        <h1 className="font-serif text-5xl font-medium tracking-tight text-foreground sm:text-7xl sm:leading-[1.1]">
          {hero.headlinePrefix}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic pr-2">
            {hero.headlineEmphasis}
          </span>
          <br className="hidden sm:block" />
          {hero.headlineSuffix}
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground sm:text-2xl">{hero.subline}</p>
        <div className="mt-6">
          <WhatsAppCta variant="hero" />
        </div>
        <p className="text-sm text-muted-foreground/80">{hero.ctaMicrocopy}</p>
      </div>
    </header>
  );
}
