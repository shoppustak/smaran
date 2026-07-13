import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { TrustPricing } from "@/components/TrustPricing";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <TrustPricing />
        <FAQ />
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
