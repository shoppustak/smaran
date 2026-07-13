import { useLanguage } from "@/context/LanguageContext";

export function Footer() {
  const { content } = useLanguage();
  const { footer, hero } = content;

  return (
    <footer className="relative overflow-hidden bg-foreground px-6 py-16 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20"
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-center text-center md:max-w-md md:items-start md:text-left">
            <img
              src="/logo-lockup.png"
              alt={hero.wordmarkDevanagari}
              className="h-16 w-auto"
            />
            <p className="mt-5 text-sm leading-relaxed text-background/80">
              {footer.aboutLine}
            </p>
          </div>

          <div className="hidden flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-xl md:flex">
            <img
              src="/qr-whatsapp.png"
              alt={hero.qrCaption}
              className="h-28 w-28 rounded-lg"
            />
            <span className="text-xs font-medium text-foreground">
              {hero.qrCaption}
            </span>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="w-full text-base text-background/60">
            {footer.privacyLine} {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
