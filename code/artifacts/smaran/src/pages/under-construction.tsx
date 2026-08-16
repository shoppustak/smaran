import { Hammer, HardHat } from "lucide-react";

export default function UnderConstruction() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <HardHat className="h-24 w-24 text-primary" />
            <Hammer className="h-12 w-12 text-muted-foreground absolute -bottom-2 -right-2" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Under Construction
        </h1>
        
        <p className="text-lg text-muted-foreground">
          We're taking a short break from development. We'll be back in about a month with updates!
        </p>
      </div>
    </div>
  );
}
