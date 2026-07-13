import { Layout } from "@/components/layout";
import { useSmaranStore } from "@/hooks/use-smaran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTithi, translateEventType } from "@/lib/utils";
import { Phone, MapPin, Calendar, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

// A dummy component for the roster detail
// Note: using wouter route params in parent to pass id
export default function YajmanDetail({ params }: { params: { id: string } }) {
  const { yajmans, events, ledger } = useSmaranStore();
  
  const yajman = yajmans.find(y => y.id === params.id);
  
  if (!yajman) {
    return (
      <Layout title="Family Details">
        <div className="text-center py-12">Family not found</div>
      </Layout>
    );
  }

  const familyEvents = events.filter(e => e.yajman_id === yajman.id);
  const familyLedger = ledger.filter(l => l.yajman_id === yajman.id);

  return (
    <Layout title={`${yajman.family_name} Parivar`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Card className="paper-texture overflow-hidden border-primary/20">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-serif text-primary mb-1">{yajman.family_name} Parivar</h1>
                <p className="text-xl font-serif italic text-muted-foreground">Gotra: {yajman.gotra}</p>
              </div>
              <Badge variant={yajman.family_sub_status === 'active' ? 'secondary' : 'outline'}>
                {yajman.family_sub_status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{yajman.locality}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{yajman.whatsapp_number}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recorded Tithis & Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {familyEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              ) : (
                familyEvents.map(event => (
                  <div key={event.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="font-medium">{translateEventType(event.event_type)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {event.maas} {formatTithi(event.paksha, event.tithi)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last performed: {event.last_performed_year}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Dakshina History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {familyLedger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ledger entries.</p>
              ) : (
                familyLedger.map(entry => (
                  <div key={entry.id} className="border-b last:border-0 pb-3 last:pb-0 flex justify-between items-center">
                    <div>
                      <div className="font-medium">₹{entry.amount}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(entry.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Badge variant={entry.payment_status === 'corroborated' ? 'success' : 'outline'}>
                      {entry.payment_status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
