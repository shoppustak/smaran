import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center p-4 bg-background">
      <h1 className="font-serif text-6xl text-primary mb-4">404</h1>
      <p className="text-xl mb-8 font-serif">Page not found</p>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
