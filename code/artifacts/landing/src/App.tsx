import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";

function AppContent() {
  const { content } = useLanguage();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex items-center gap-4">
        <p className="font-serif text-3xl">{content.hero.wordmarkDevanagari}</p>
        <LanguageToggle />
      </div>
      <p>{content.hero.headlinePrefix + content.hero.headlineEmphasis + content.hero.headlineSuffix}</p>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
