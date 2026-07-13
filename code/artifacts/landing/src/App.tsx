import { Hero } from "@/components/Hero";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-[100dvh] bg-background text-foreground">
        <Hero />
      </div>
    </LanguageProvider>
  );
}

export default App;
