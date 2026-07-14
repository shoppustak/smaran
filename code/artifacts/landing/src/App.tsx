import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustRow } from "@/components/TrustRow";
import { Features } from "@/components/Features";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col relative overflow-x-hidden">
        <Header />
        <main className="flex-grow">
          <Hero />
          <Features />
          <TrustRow />
          <FAQ />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}

export default App;
