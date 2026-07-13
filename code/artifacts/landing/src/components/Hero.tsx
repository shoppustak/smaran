import { LanguageToggle } from "@/components/LanguageToggle";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { useLanguage } from "@/context/LanguageContext";

export function Hero() {
  const { content } = useLanguage();
  const { hero } = content;

  return (
    <header className="relative min-h-[90vh] overflow-hidden flex flex-col bg-[#FAF9FC]">
      {/* Tango-style background gradient wash — full hero, edge to edge, clearly visible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-background via-primary/15 to-secondary/25"
      />
      
      {/* Full-width Top Navigation */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center">
          <div className="flex flex-col items-start leading-none">
            <span className="font-serif text-3xl font-bold text-slate-900 tracking-tight pb-1">
              {hero.wordmarkDevanagari}
            </span>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {/* 2-Column Hero Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6 pb-12 pt-0 lg:flex-row lg:items-center lg:pt-4 lg:pb-16">
        
        {/* Left Column - Typography & CTA */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left pt-0 lg:pr-8">
          <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl shadow-black/5 ring-1 ring-black/5 mb-8">
            <div 
              className="w-12 h-12 bg-slate-900 shrink-0" 
              style={{
                WebkitMaskImage: 'url(/logo_true_vector.svg)',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskSize: '220%', 
              }}
            />
          </div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl lg:leading-[1.1]">
            {hero.headlinePrefix}
            <span className="text-primary italic pr-2 font-serif font-medium">
              {hero.headlineEmphasis}
            </span>
            <br className="hidden lg:block" />
            {hero.headlineSuffix}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-2xl">
            {hero.subline}
          </p>
          
          <div className="mt-10 flex w-full justify-center lg:justify-start">
            <WhatsAppCta variant="hero" />
          </div>
        </div>

        {/* Right Column - Visual Composition */}
        <div className="relative w-full max-w-lg lg:w-[500px] shrink-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-secondary/5 shadow-2xl shadow-primary/5 ring-1 ring-border/50">
            {/* Soft background blob */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
            
            {/* The Composed Elements inside the container */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              
              {/* Floating QR Card */}
              <div className="group relative z-20 flex flex-col items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-xl shadow-primary/10 ring-1 ring-black/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/20">
                <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                  <img
                    src="/qr-whatsapp.png"
                    alt={content.hero.qrCaption}
                    className="h-40 w-40 rounded-xl mix-blend-multiply sm:h-48 sm:w-48"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground">Scan with your phone</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{content.hero.qrCaption}</p>
                </div>
              </div>

              {/* Fake WhatsApp Message Bubbles floating behind/below */}
              <div className="absolute bottom-12 left-6 z-10 max-w-[70%] rounded-2xl rounded-bl-sm bg-white p-4 shadow-sm ring-1 ring-black/5 transform -rotate-2">
                <p className="text-sm font-medium text-foreground">Next Reminder 🔔</p>
                <p className="text-xs text-muted-foreground mt-1">Tomorrow: Gayatri Yagya</p>
              </div>
              <div className="absolute top-16 right-6 z-10 max-w-[70%] rounded-2xl rounded-br-sm bg-[#D9FDD3] p-4 shadow-sm ring-1 ring-black/5 transform rotate-3">
                <p className="text-sm font-medium text-foreground">Added to Smaran</p>
                <p className="text-xs text-muted-foreground mt-1 text-right">✓✓</p>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Elegant Bottom Curve Divider */}
      <div className="absolute bottom-0 inset-x-0 w-full overflow-hidden leading-none">
        <svg
          className="block w-full h-[40px] md:h-[80px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C300,120 900,120 1200,0 L1200,120 L0,120 Z"
            className="fill-background"
          ></path>
          <path
            d="M0,0 C300,120 900,120 1200,0"
            className="stroke-border/40"
            fill="none"
            strokeWidth="1"
          ></path>
        </svg>
      </div>
    </header>
  );
}
