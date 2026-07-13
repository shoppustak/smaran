import { Layout } from "@/components/layout";
import { PanchangWidget } from "@/components/panchang-widget";
import { useSmaranStore } from "@/hooks/use-smaran";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { formatTithi, translateEventType } from "@/lib/utils";
import { Calendar, Bell, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { getUpcomingEvents, yajmans } = useSmaranStore();
  const upcomingEvents = getUpcomingEvents().slice(0, 5);

  const getYajman = (id: string) => yajmans.find(y => y.id === id);

  return (
    <Layout title="Remember">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl text-primary">Pranam.</h1>
          <p className="text-muted-foreground text-lg">Your upcoming rituals for this fortnight.</p>
        </div>

        <PanchangWidget />

        {upcomingEvents.length === 0 ? (
          <Card className="bg-transparent border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-serif text-xl mb-2">No upcoming rituals scheduled</p>
              <p className="text-sm">Your calendar is clear for the next few days.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map(event => {
              const yajman = getYajman(event.yajman_id);
              if (!yajman) return null;
              
              const date = new Date(event.resolved_date);
              const isEventToday = isToday(date);
              const isEventTomorrow = isTomorrow(date);
              
              let dateString = format(date, "EEEE, MMMM d, yyyy");
              if (isEventToday) dateString = "Today";
              else if (isEventTomorrow) dateString = "Tomorrow";

              return (
                <Card key={event.id} className="paper-texture border-primary/20 overflow-visible transition-transform hover:-translate-y-1 duration-300">
                  <CardHeader className="pb-3 relative z-10 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isEventToday ? "default" : "outline"} className={isEventToday ? "bg-primary text-primary-foreground" : "border-primary text-primary"}>
                          {dateString}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.maas} {formatTithi(event.paksha, event.tithi)}
                        </span>
                      </div>
                      <CardTitle className="text-xl mt-2">
                        {translateEventType(event.event_type)}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        for {yajman.family_name} Parivar
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium block">Gotra</span>
                      <span className="font-serif text-lg text-primary">{yajman.gotra}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        {event.start_time && event.end_time ? (
                          <span>Muhurat: {event.start_time} - {event.end_time}</span>
                        ) : (
                          <span>Full day auspicious</span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Locality: {yajman.locality}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="relative z-10 bg-accent/30 pt-4 border-t flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Reminded {formatDistanceToNow(new Date(), { addSuffix: true })}
                    </p>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" className="bg-background">
                        <Bell className="w-4 h-4 mr-2" />
                        Send Reminder
                      </Button>
                      <Button size="sm">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    </div>
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
