import { Hammer, HardHat } from "lucide-react";

// Under construction — the full landing page components (Header, Hero,
// Features, TrustRow, FAQ, Footer) are still in src/components/ and come back
// by restoring the previous version of this file.
function App() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <HardHat className="h-24 w-24 text-primary" />
            <Hammer className="h-12 w-12 text-text-muted absolute -bottom-2 -right-2" />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">
          निर्माणाधीन
        </h1>

        <p className="text-lg text-text-muted">
          स्मरण अभी बन रहा है। लगभग एक महीने में वापस मिलेंगे।
        </p>

        <p className="text-base text-text-muted">
          Under construction — we&rsquo;ll be back in about a month.
        </p>
      </div>
    </div>
  );
}

export default App;
