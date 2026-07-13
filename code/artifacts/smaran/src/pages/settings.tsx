import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSmaranStore } from "@/hooks/use-smaran";
import { WhatsappTestPanel } from "@/components/whatsapp-test-panel";

export default function Settings() {
  const { purohit } = useSmaranStore();

  return (
    <Layout title="Settings">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <h1 className="font-serif text-3xl">Practice Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>How you appear to your yajmans on cards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input defaultValue={purohit.name} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input defaultValue={purohit.city} />
            </div>
            <div className="space-y-2">
              <Label>Settlement UPI ID</Label>
              <Input defaultValue={purohit.upi_id} />
              <p className="text-xs text-muted-foreground">All dakshina will be routed directly to this VPA.</p>
            </div>
            <Button className="mt-4">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar System</CardTitle>
            <CardDescription>Crucial for accurate Panchang resolution.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button variant={purohit.calendar_system === 'purnimanta' ? 'default' : 'outline'} className="flex-1">
                Purnimanta (North)
              </Button>
              <Button variant={purohit.calendar_system === 'amanta' ? 'default' : 'outline'} className="flex-1">
                Amanta (South)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Currently set to {purohit.calendar_system}. Changing this will recalculate all upcoming tithis.
            </p>
          </CardContent>
        </Card>

        <WhatsappTestPanel />

      </div>
    </Layout>
  );
}
