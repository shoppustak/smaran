import { Layout } from "@/components/layout";
import { useSmaranStore } from "@/hooks/use-smaran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIndianCurrency, translateEventType } from "@/lib/utils";
import { Wallet, Check, CheckCircle2, Clock, Send, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Collect() {
  const { ledger, yajmans, events, updateLedgerStatus } = useSmaranStore();

  return (
    <Layout title="Collect">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-primary flex items-center gap-3">
            <Wallet className="h-8 w-8" />
            Dakshina Ledger
          </h1>
          <p className="text-muted-foreground">
            Your corroborated record of rituals completed and dakshina received. Money flows directly to your UPI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Corroborated</div>
              <div className="text-3xl font-serif text-primary">
                {formatIndianCurrency(ledger.filter(l => l.payment_status === 'corroborated').reduce((sum, l) => sum + l.amount, 0))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-dashed">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Pending Confirmation</div>
              <div className="text-3xl font-serif text-foreground">
                {formatIndianCurrency(ledger.filter(l => l.payment_status === 'claimed').reduce((sum, l) => sum + l.amount, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif text-xl border-b pb-2">Recent Entries</h2>
          
          {ledger.map(entry => {
            const yajman = yajmans.find(y => y.id === entry.yajman_id);
            const event = events.find(e => e.id === entry.event_id);
            if (!yajman) return null;

            return (
              <Card key={entry.id} className="paper-texture">
                <div className="flex flex-col sm:flex-row">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium">{yajman.family_name} Parivar</h3>
                      <div className="text-xl font-serif font-semibold">{formatIndianCurrency(entry.amount)}</div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      {event ? (
                        <span>For {translateEventType(event.event_type)} on {format(parseISO(entry.created_at), 'MMM d, yyyy')}</span>
                      ) : (
                        <span>General dakshina on {format(parseISO(entry.created_at), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {entry.payment_status === 'pending' && (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                          <Clock className="w-3 h-3 mr-1" /> Draft
                        </Badge>
                      )}
                      {entry.payment_status === 'claimed' && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-transparent">
                          <Send className="w-3 h-3 mr-1" /> Card Sent
                        </Badge>
                      )}
                      {entry.payment_status === 'corroborated' && (
                        <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200 border-transparent">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Corroborated
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-accent/30 p-6 sm:w-64 border-t sm:border-t-0 sm:border-l border-border flex flex-col justify-center">
                    {entry.payment_status === 'pending' && (
                      <Button onClick={() => updateLedgerStatus(entry.id, 'claimed')} className="w-full mb-2">
                        Generate UPI Card
                      </Button>
                    )}
                    {entry.payment_status === 'claimed' && (
                      <div className="text-sm text-center">
                        <p className="text-muted-foreground mb-3 text-xs">Waiting for family to tap "Confirm"</p>
                        <Button variant="outline" onClick={() => updateLedgerStatus(entry.id, 'corroborated')} className="w-full border-green-600 text-green-700 hover:bg-green-50">
                          <Check className="w-4 h-4 mr-2" />
                          Simulate Family Tap
                        </Button>
                      </div>
                    )}
                    {entry.payment_status === 'corroborated' && (
                      <div className="text-center text-sm text-green-700 font-medium flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                        <div>Settled to your UPI</div>
                        <div className="text-xs text-muted-foreground font-normal mt-1">Confirmed {entry.family_confirmed_at ? format(parseISO(entry.family_confirmed_at), 'MMM d') : ''}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

      </div>
    </Layout>
  );
}
