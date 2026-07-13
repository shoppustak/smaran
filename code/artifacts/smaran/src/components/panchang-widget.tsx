import { useGetPanchang } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Sparkles } from "lucide-react";

export function PanchangWidget() {
  const { data, isLoading, isError } = useGetPanchang();

  if (isLoading) {
    return (
      <Card className="paper-texture border-primary/20">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Consulting the Panchang…
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <Card className="paper-texture border-primary/20 bg-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Today&apos;s Panchang
          </CardTitle>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {data.source === "sandbox" ? "Vedika sandbox" : "Vedika live"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="block text-muted-foreground">Tithi</span>
            <span className="font-serif text-primary text-base">
              {data.tithi.paksha} {data.tithi.name}
            </span>
          </div>
          <div>
            <span className="block text-muted-foreground">Nakshatra</span>
            <span className="font-serif text-primary text-base">{data.nakshatra.name}</span>
          </div>
          <div>
            <span className="block text-muted-foreground">Maas</span>
            <span className="font-serif text-primary text-base">{data.masa.name}</span>
          </div>
          <div>
            <span className="block text-muted-foreground">Overall</span>
            <span className="font-serif text-primary text-base">{data.overallAuspiciousness}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{data.summary}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60 mt-2">
          <Compass className="h-3.5 w-3.5" />
          <span>Disha Shool: {data.dishaShool.direction} — {data.dishaShool.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
