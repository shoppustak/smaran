import { BellRing, HeartHandshake, ShieldCheck, IndianRupee, MessageCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function Features() {
  const { lang, content } = useLanguage();
  const [tithi, reconnect, protect, dakshina] = content.howItWorks.items;

  return (
    <section className="relative bg-background py-12 md:py-16 px-6">

      <div className="relative z-10 mx-auto max-w-[1200px]">
        
        <div className="flex flex-col gap-16 md:gap-20">
          
          {/* Content Block 1: Smart Ledger & Safety (Left Cards Stack, Right Copy) */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            
            {/* Left: Stack of cards floating over multicolor glow */}
            <div className="relative flex justify-center lg:col-span-6 z-10 order-2 lg:order-1">
              
              {/* Layered glowing gradient patches directly behind and below the cards stack */}
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center scale-95 blur-[80px] opacity-[0.85]" aria-hidden="true">
                <div className="absolute h-56 w-56 rounded-full bg-[#B6A8FF] -translate-x-12 -translate-y-6" />
                <div className="absolute h-56 w-56 rounded-full bg-[#7CC8FF] translate-x-12 translate-y-6" />
              </div>

              <div className="flex flex-col gap-4 w-full max-w-[420px] sm:max-w-[460px] z-10">
                
                {/* Card 1: Tithi Reminder */}
                <div className="card-styled rounded-lg border border-border bg-white p-4 shadow-card transition-all duration-300 hover:translate-x-1">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-2 mb-2">
                    <div className="h-5 w-5 rounded-full bg-[#E6F8EE] text-[#1F8C5A] flex items-center justify-center text-[10px] font-bold">
                      स्म
                    </div>
                    <span className="text-[12px] font-bold text-foreground">Smaran Bot</span>
                    <span className="ml-auto text-[10px] font-medium text-text-muted">10:00 AM</span>
                  </div>
                  <p className="fs-body leading-relaxed text-foreground font-medium">
                    {lang === "hi" ? (
                      <>प्रणाम शास्त्री जी 🙏 कल श्री शर्मा जी के पूज्य पिता जी का <strong>श्राद्ध</strong> है। क्या आप उन्हें याद दिलाना संदेश भेजना चाहते हैं?</>
                    ) : (
                      <>Pranam Shastri ji 🙏 Tomorrow is the <strong>Shradh of Shri Sharma's father</strong>. Send a remembrance message?</>
                    )}
                  </p>
                </div>

                {/* Card 2: Muhurat Protection (Red Status Pill Tint) */}
                <div 
                  className="rounded-lg border border-border p-4 shadow-card transition-all duration-300 hover:translate-x-1"
                  style={{ backgroundColor: "var(--pill-red-bg)", borderColor: "rgba(181, 58, 58, 0.15)" }}
                >
                  <div className="flex items-center gap-2 border-b border-red-500/10 pb-2 mb-2">
                    <ShieldCheck className="h-4 w-4" style={{ color: "var(--pill-red-fg)" }} />
                    <span className="text-[12px] font-bold" style={{ color: "var(--pill-red-fg)" }}>
                      {lang === "hi" ? "मुहूर्त सुरक्षा अलर्ट" : "Muhurat Protection Alert"}
                    </span>
                    <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--pill-red-fg)", opacity: 0.8 }}>11:32 AM</span>
                  </div>
                  <p className="fs-body leading-relaxed font-semibold" style={{ color: "var(--pill-red-fg)" }}>
                    {lang === "hi" ? (
                      <>⚠️ <strong>समय टकराव!</strong> दिनांक 14 नवंबर को सुबह 9:00 बजे शर्मा परिवार का गृह-प्रवेश है, जो वर्मा परिवार की कथा (9:30 AM) से टकरा रहा है।</>
                    ) : (
                      <>⚠️ <strong>Overlap Alert!</strong> Nov 14 9:00 AM booking overlaps with Verma family Satyanarayan Puja (9:30 AM).</>
                    )}
                  </p>
                </div>

              </div>
            </div>

            {/* Right: Copy (H2 + P) */}
            <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left order-1 lg:order-2">
              <span className="fs-eyebrow tracking-[0.08em] uppercase text-text-secondary font-semibold mb-4">
                {lang === "hi" ? "समय व सुरक्षा" : "Ledger & Safety"}
              </span>
              <h2 className="fs-h2 text-foreground tracking-tight leading-[1.15] mb-6">
                {lang === "hi" ? "तिथि स्मरण और मुहूर्त सुरक्षा" : "Tithi Reminders & Muhurat Protection"}
              </h2>
              <p className="fs-body-lg text-text-secondary leading-[1.6] mb-6">
                {lang === "hi" ? (
                  <>स्मरण पंचांग और बही खाता को आपके WhatsApp पर जोड़ता है। यह समय से पहले आपको यजमानों की तिथियां याद दिलाता है और एक ही मुहूर्त पर दो बुकिंग होने से रोकता है।</>
                ) : (
                  <>Smaran matches your calendar directly inside WhatsApp. It alerts you to upcoming tithis and protects your schedule from double bookings ahead of time.</>
                )}
              </p>
              
              <div className="flex flex-col gap-4 w-full">
                {tithi && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-1">
                      <BellRing className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="fs-body font-bold text-foreground">{tithi.label}</h4>
                      <p className="fs-body text-text-secondary mt-1">{tithi.body}</p>
                    </div>
                  </div>
                )}
                {protect && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-1">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="fs-body font-bold text-foreground">{protect.label}</h4>
                      <p className="fs-body text-text-secondary mt-1">{protect.body}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Content Block 2: Dakshina with Dignity (Right Cards Stack, Left Copy) */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            
            {/* Left: Copy (H2 + P) on Desktop */}
            <div className="flex flex-col items-center text-center lg:col-span-6 lg:items-start lg:text-left order-1 lg:order-1">
              <span className="fs-eyebrow tracking-[0.08em] uppercase text-text-secondary font-semibold mb-4">
                {lang === "hi" ? "दक्षिणा व सम्मान" : "Dakshina & Dignity"}
              </span>
              <h2 className="fs-h2 text-foreground tracking-tight leading-[1.15] mb-6">
                {dakshina ? dakshina.label : "Dakshina, with dignity"}
              </h2>
              <p className="fs-body-lg text-text-secondary leading-[1.6] mb-6">
                {dakshina ? dakshina.body : ""}
              </p>
              
              <div className="flex flex-col gap-4 w-full">
                {reconnect && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary mt-1">
                      <HeartHandshake className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="fs-body font-bold text-foreground">{reconnect.label}</h4>
                      <p className="fs-body text-text-secondary mt-1">{reconnect.body}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cards Stack floating over Peach/Pink glow */}
            <div className="relative flex justify-center lg:col-span-6 order-2 lg:order-2">
              
              {/* Layered glowing gradient patches directly behind and below the cards stack */}
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center scale-95 blur-[80px] opacity-[0.85]" aria-hidden="true">
                <div className="absolute h-56 w-56 rounded-full bg-[#FFB58A] -translate-x-12 -translate-y-6" />
                <div className="absolute h-56 w-56 rounded-full bg-[#FF8AB2] translate-x-12 translate-y-6" />
              </div>

              <div className="flex flex-col gap-4 w-full max-w-[420px] sm:max-w-[460px] z-10">
                
                {/* Card 1: WhatsApp Gratitude Card */}
                <div className="card-styled rounded-lg border border-border bg-[#E6F8EE] p-4 shadow-card transition-all duration-300 hover:translate-x-1">
                  <div className="flex items-center gap-2 border-b border-[#1F8C5A]/10 pb-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-[#1F8C5A]" />
                    <span className="text-[12px] font-bold text-[#1F8C5A]">
                      {lang === "hi" ? "धन्यवाद संदेश" : "Gratitude Message"}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-[#1F8C5A]/80">2:45 PM</span>
                  </div>
                  <p className="fs-body leading-relaxed text-[#1F8C5A] font-medium">
                    {lang === "hi" ? (
                      <>गृह-प्रवेश पूजा संपन्न कराने के लिए धन्यवाद, शर्मा जी। दक्षिणा सीधे शास्त्री जी के UPI पर भेजने के लिए नीचे लिंक का उपयोग करें।</>
                    ) : (
                      <>Thank you for performing the Griha Pravesh Puja, Sharma family. Use the link below to pay dakshina directly to Shastri ji.</>
                    )}
                  </p>
                </div>

                {/* Card 2: Payment Receipt Confirmation */}
                <div className="card-styled rounded-lg border border-[#1F8C5A]/10 bg-[#E6F8EE] p-4 shadow-card transition-all duration-300 hover:translate-x-1">
                  <div className="flex items-center gap-2 border-b border-[#1F8C5A]/10 pb-2 mb-2">
                    <IndianRupee className="h-4 w-4 text-[#1F8C5A]" />
                    <span className="text-[12px] font-bold text-[#1F8C5A]">
                      {lang === "hi" ? "भुगतान प्राप्त हुआ" : "Payment Received"}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-[#1F8C5A]/80">2:46 PM</span>
                  </div>
                  <p className="fs-body leading-relaxed text-[#1F8C5A] font-medium">
                    {lang === "hi" ? (
                      <>शर्मा परिवार से ₹2,100 का सीधा भुगतान प्राप्त हुआ। 100% राशि सीधे आपके बैंक खाते में जमा हो गई है।</>
                    ) : (
                      <>You have received a direct payment of ₹2,100 from Sharma family. 100% of it has settled in your bank account.</>
                    )}
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
