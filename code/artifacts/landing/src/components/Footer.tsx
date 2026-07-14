import { useLanguage } from "@/context/LanguageContext";

export function Footer() {
  const { content } = useLanguage();
  const { footer, hero } = content;

  return (
    <footer className="w-full bg-background pt-12 pb-0 px-6 relative">
      <div className="mx-auto max-w-[1200px]">
        
        {/* Main Footer Layout: Grid on desktop */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-stretch">
          
          {/* Left Column (Brand + Metadata) */}
          <div className="md:col-span-8 flex flex-col justify-between gap-8 text-center md:text-left pb-12">
            
            {/* Top Part: Brand + Tagline */}
            <div className="max-w-xl">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <img
                  src="/smaran-logo-origami.png"
                  alt={hero.wordmarkDevanagari}
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl font-bold tracking-tight bg-gradient-to-br from-[#B6A8FF] to-[#FFB58A] bg-clip-text text-transparent">
                  {hero.wordmarkDevanagari}
                </span>
              </div>
              <p className="mt-4 fs-body text-text-secondary leading-[1.6]">
                {footer.aboutLine}
              </p>
            </div>

            {/* Bottom Part: Privacy & Copyright on same horizontal line on desktop */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-auto border-t border-border/30 pt-6">
              <p id="privacy" className="fs-body text-text-muted leading-[1.6]">
                {footer.privacyLine}
              </p>
              <p className="fs-body text-text-muted font-medium shrink-0">
                {footer.copyright}
              </p>
            </div>

          </div>

          {/* Right Column (Vertical QR Card aligned to bottom) */}
          <div className="md:col-span-4 flex justify-center md:justify-end items-end pb-0">
            
            <div className="flex flex-col items-center gap-3 bg-white border border-b-0 border-border rounded-t-2xl rounded-b-none shadow-card p-5 pb-4 max-w-[200px] mx-auto md:mx-0 text-center self-end">
              <img
                src="/qr-whatsapp.png"
                alt={hero.qrCaption}
                className="h-28 w-28 rounded-xl border border-border/80"
              />
              <div className="flex flex-col">
                <span className="fs-body font-extrabold text-foreground tracking-tight">
                  {footer.qrHeader}
                </span>
                <span className="fs-body text-text-muted mt-1 font-medium leading-tight">
                  {footer.qrSub}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </footer>
  );
}
