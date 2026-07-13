import { Layout } from "@/components/layout";
import { useSmaranStore } from "@/hooks/use-smaran";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, ChevronRight, Phone } from "lucide-react";
import { useState } from "react";

export default function Roster() {
  const { yajmans } = useSmaranStore();
  const [search, setSearch] = useState("");

  const filteredYajmans = yajmans.filter(y => 
    y.family_name.toLowerCase().includes(search.toLowerCase()) || 
    y.gotra.toLowerCase().includes(search.toLowerCase()) ||
    y.locality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Yajman Roster">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by family, gotra, or locality..." 
              className="pl-9 bg-card border-primary/20 focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button asChild>
            <Link href="/add">Add Yajman</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredYajmans.map(yajman => (
            <Link key={yajman.id} href={`/roster/${yajman.id}`}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full flex flex-col paper-texture group">
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {yajman.family_name}
                    </CardTitle>
                    {yajman.family_sub_status === 'active' && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Active</Badge>
                    )}
                    {yajman.family_sub_status === 'lapsed' && (
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20">Lapsed</Badge>
                    )}
                  </div>
                  <CardDescription className="font-serif italic text-primary">
                    Gotra: {yajman.gotra}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 flex-1 flex flex-col justify-end">
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <span className="w-16 font-medium">Locality:</span>
                      <span>{yajman.locality}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <span className="w-16 font-medium">Contact:</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {yajman.whatsapp_number}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          
          {filteredYajmans.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <p className="font-serif text-xl">No families found matching "{search}"</p>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
