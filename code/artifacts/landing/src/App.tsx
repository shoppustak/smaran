import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { FeatureBlocks } from "@/components/FeatureBlocks";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
        <FeatureBlocks />
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
