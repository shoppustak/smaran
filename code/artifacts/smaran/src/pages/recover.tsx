import { Layout } from "@/components/layout";
import { useSmaranStore } from "@/hooks/use-smaran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, ShieldAlert, History } from "lucide-react";
import { translateEventType, formatTithi } from "@/lib/utils";

export default function Recover() {
  const { getOverdueEvents, yajmans } = useSmaranStore();
  const overdueEvents = getOverdueEvents();

  return (
    <Layout title="Recover">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-destructive flex items-center gap-3">
            <ShieldAlert className="h-8 w-8" />
            Lapsed Relationships
          </h1>
          <p className="text-muted-foreground">
            Families who performed an annual ritual with you in previous years, but have not booked this cycle.
          </p>
        </div>

        {overdueEvents.length === 0 ? (
          <Card className="bg-transparent border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-serif text-xl mb-2">No overdue rituals</p>
              <p className="text-sm">All your families are up to date for this cycle.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {overdueEvents.map(event => {
              const yajman = yajmans.find(y => y.id === event.yajman_id);
              if (!yajman) return null;

              return (
                <Card key={event.id} className="border-destructive/20 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive"></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">
                          {yajman.family_name} Parivar
                        </CardTitle>
                        <CardDescription className="text-base mt-1 text-destructive/80 font-medium">
                          Missed: {translateEventType(event.event_type)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-destructive border-destructive">
                        Last seen {event.last_performed_year}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Traditionally performed in <span className="font-medium text-foreground">{event.maas} {formatTithi(event.paksha, event.tithi)}</span>.
                      They have not reached out for this cycle yet.
                    </p>
                  </CardContent>
                  <CardFooter className="bg-accent/30 pt-4 border-t flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Send a respectful namaskar card to gently remind them of their ancestral obligation.
                    </p>
                    <Button variant="secondary" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                      Generate Namaskar Card <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </Layout>
  );
}
