import { useLanguage } from "@/context/LanguageContext";
import { CalendarHeart, ShieldCheck } from "lucide-react";

export function FeatureBlocks() {
  const { content } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Block 1: Reminders & Reconnect (Text Left, Visual Right) */}
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-24">
          <div className="flex flex-1 flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.25rem] bg-primary/10 ring-1 ring-primary/20 mb-8 lg:mx-0 mx-auto shadow-sm text-primary">
               <CalendarHeart className="h-8 w-8" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Never miss a <span className="font-serif italic text-primary">Tithi</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {content.howItWorks.items[0]?.body} {content.howItWorks.items[1]?.body}
            </p>
          </div>
          
          <div className="relative w-full max-w-xl shrink-0 lg:w-[500px] mx-auto lg:mx-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-secondary/5 ring-1 ring-border/50 flex items-center justify-center p-8">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
               {/* Abstract Visual Elements */}
               <div className="relative z-10 flex flex-col gap-4">
                 <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xl shadow-primary/5 ring-1 ring-black/5 transform -rotate-3 transition-transform hover:rotate-0">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                     <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                   </div>
                   <div>
                     <p className="font-medium text-foreground">Reminder Scheduled</p>
                     <p className="text-sm text-muted-foreground">3 days before Tithi</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xl shadow-primary/5 ring-1 ring-black/5 transform translate-x-8 rotate-2 transition-transform hover:rotate-0">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                     <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                   </div>
                   <div>
                     <p className="font-medium text-foreground">Family Connected</p>
                     <p className="text-sm text-muted-foreground">Automatic updates sent</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Tight Spacer for alternate tiling (no divider) */}
        <div className="h-16 lg:h-24" />

        {/* Block 2: Privacy & Pricing (Visual Left, Text Right) */}
        <div className="flex flex-col-reverse gap-12 lg:flex-row lg:items-center lg:gap-24">
          <div className="relative w-full max-w-xl shrink-0 lg:w-[500px] mx-auto lg:mx-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary/5 to-primary/5 ring-1 ring-border/50 flex items-center justify-center p-8">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
               {/* Abstract Visual Elements */}
               <div className="relative z-10 flex flex-col gap-6 items-center">
                 <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-secondary to-orange-400 text-white shadow-2xl shadow-secondary/30 transform rotate-3 transition-transform hover:rotate-0">
                   <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                 </div>
                 
                 <div className="rounded-xl bg-white/80 backdrop-blur-md px-6 py-3 shadow-lg ring-1 ring-black/5 flex items-center gap-3">
                   <span className="text-2xl font-bold text-foreground">₹0</span>
                   <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Always Free</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center text-center lg:text-left">
            <div className="flex items-center gap-4 mb-6 mx-auto lg:mx-0">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 ring-1 ring-secondary/20 shadow-sm text-secondary">
                 <ShieldCheck className="h-7 w-7" strokeWidth={2} />
              </div>
              <span className="inline-flex items-center rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary ring-1 ring-inset ring-secondary/20">
                Simple Pricing
              </span>
            </div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Private. Secure. <br/><span className="font-serif italic text-secondary text-5xl sm:text-7xl block mt-2">Always Free.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {content.howItWorks.items[2]?.body} {content.pricing.framingLine} {content.pricing.priceLine}.
            </p>
          </div>
        </div>
        
      </div>
    </section>
  );
}
