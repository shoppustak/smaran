import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PricingCard } from "@/components/PricingCard";
import { TrustRow } from "@/components/TrustRow";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
        <TrustRow />
        <PricingCard />
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
