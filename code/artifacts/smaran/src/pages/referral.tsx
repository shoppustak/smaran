import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users } from "lucide-react";

export default function Referral() {
  return (
    <Layout title="Invite Purohit">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-3xl text-primary">Strengthen the Parampara</h1>
          <p className="text-muted-foreground text-lg">
            Smaran grows through trust. Invite a fellow purohit to secure his practice.
          </p>
        </div>

        <Card className="bg-primary/5 border-primary/20 paper-texture">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Share2 className="h-8 w-8" />
            </div>
            
            <div>
              <h3 className="font-serif text-2xl mb-2">Your Personal Invite Card</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Share this card on WhatsApp. When a purohit joins through your link, they receive a special early-bird setup.
              </p>
            </div>

            <div className="w-full max-w-md bg-background border p-4 rounded-lg font-mono text-sm flex items-center justify-between">
              <span className="truncate text-muted-foreground">https://smaran.in/invite/pt-rameshwar-398</span>
              <Button variant="ghost" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button className="w-full max-w-md" size="lg">
              Share to WhatsApp
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Purohits Invited</CardDescription>
              <CardTitle className="text-3xl font-serif">3</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sabhas Reached</CardDescription>
              <CardTitle className="text-3xl font-serif">1</CardTitle>
            </CardHeader>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
