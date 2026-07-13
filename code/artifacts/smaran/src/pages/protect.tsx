import { Layout } from "@/components/layout";
import { useSmaranStore, RitualEvent } from "@/hooks/use-smaran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { translateEventType } from "@/lib/utils";
import { Calendar as CalendarIcon, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";

export default function Protect() {
  const { events, yajmans } = useSmaranStore();
  
  // Get this week's dates
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Find conflicts
  const eventsWithTime = events.filter(e => e.start_time && e.end_time);
  const conflicts: RitualEvent[] = [];
  
  // Very simplistic conflict detection for demo: same day, overlapping hours
  for (let i = 0; i < eventsWithTime.length; i++) {
    for (let j = i + 1; j < eventsWithTime.length; j++) {
      const e1 = eventsWithTime[i];
      const e2 = eventsWithTime[j];
      if (e1.resolved_date === e2.resolved_date) {
        // Assume format HH:mm
        const e1Start = parseInt(e1.start_time!.split(':')[0]);
        const e1End = parseInt(e1.end_time!.split(':')[0]);
        const e2Start = parseInt(e2.start_time!.split(':')[0]);
        const e2End = parseInt(e2.end_time!.split(':')[0]);
        
        if ((e1Start < e2End && e1End > e2Start)) {
          if (!conflicts.find(c => c.id === e1.id)) conflicts.push(e1);
          if (!conflicts.find(c => c.id === e2.id)) conflicts.push(e2);
        }
      }
    }
  }

  return (
    <Layout title="Protect: My Week">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-primary flex items-center gap-3">
            <CalendarIcon className="h-8 w-8" />
            Schedule Defense
          </h1>
          <p className="text-muted-foreground">
            Your day-sheet for the week. Guarding your muhurats against double-booking.
          </p>
        </div>

        {conflicts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflict Warning Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground mb-4">
                You have double-booked a muhurat window. Please resolve to avoid compromising either ritual.
              </p>
              <div className="space-y-2">
                {conflicts.map(conflict => {
                  const yajman = yajmans.find(y => y.id === conflict.yajman_id);
                  return (
                    <div key={`conflict-${conflict.id}`} className="flex justify-between items-center bg-background p-3 rounded border border-destructive/20 text-sm">
                      <div>
                        <span className="font-medium">{yajman?.family_name}</span> - {translateEventType(conflict.event_type)}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {format(parseISO(conflict.resolved_date), 'MMM d')} @ {conflict.start_time}-{conflict.end_time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.resolved_date), day));
            const isTodayDay = isSameDay(today, day);
            
            return (
              <div 
                key={day.toISOString()} 
                className={`flex flex-col h-full rounded-lg border p-3 ${isTodayDay ? 'bg-primary/5 border-primary shadow-sm' : 'bg-card border-border'}`}
              >
                <div className="text-center mb-3 pb-2 border-b border-border/50">
                  <div className="text-xs text-muted-foreground uppercase">{format(day, 'EEE')}</div>
                  <div className={`text-xl font-serif ${isTodayDay ? 'text-primary font-medium' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4 opacity-50">Clear</div>
                  ) : (
                    dayEvents.map(event => {
                      const yajman = yajmans.find(y => y.id === event.yajman_id);
                      const isConflict = conflicts.find(c => c.id === event.id);
                      
                      return (
                        <div 
                          key={event.id}
                          className={`text-xs p-2 rounded border ${
                            isConflict 
                              ? 'border-destructive bg-destructive/10 text-destructive-foreground' 
                              : 'border-primary/20 bg-background'
                          }`}
                        >
                          <div className="font-medium truncate" title={yajman?.family_name}>
                            {yajman?.family_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {translateEventType(event.event_type)}
                          </div>
                          {event.start_time && (
                            <div className="mt-1 font-mono text-[10px] flex items-center">
                              <Clock className="h-2.5 w-2.5 mr-1" />
                              {event.start_time}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </Layout>
  );
}
