import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { TrustRow } from "@/components/TrustRow";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <HowItWorks />
        <TrustRow />
      </div>
    </LanguageProvider>
  );
}

export default App;
