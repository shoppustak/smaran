import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Camera, Upload, Check, StopCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AddEntry() {
  const [, setLocation] = useLocation();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleMicClick = () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      
      // Simulate extraction
      setTimeout(() => {
        setProcessing(false);
        setSuccess(true);
      }, 2000);
    } else {
      setRecording(true);
    }
  };

  return (
    <Layout title="Add Entry">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="text-center space-y-2 mb-8">
          <h1 className="font-serif text-3xl text-primary">Capture from Bahi Khata</h1>
          <p className="text-muted-foreground">Do not type. Speak or photograph your ledger entries, and Smaran will structure them for you.</p>
        </div>

        {!success ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className={`relative overflow-hidden transition-all duration-500 ${recording ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''}`}>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Voice Note</CardTitle>
                <CardDescription>Speak clearly</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Button 
                  size="icon" 
                  className={`h-24 w-24 rounded-full mb-6 ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90'}`}
                  onClick={handleMicClick}
                  disabled={processing}
                >
                  {recording ? <StopCircle className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                </Button>
                
                <div className="text-center text-sm min-h-[4rem]">
                  {recording && <p className="text-red-500 font-medium">Recording... tap to stop</p>}
                  {processing && <p className="text-primary font-medium animate-pulse">Extracting gotra, tithi, and name...</p>}
                  {!recording && !processing && <p className="text-muted-foreground italic">"Sharma parivar, gotra Kashyap, pitaji ki punyatithi Bhadrapada Krishna Dwadashi"</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-50 grayscale cursor-not-allowed">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Photograph</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Button size="icon" disabled className="h-24 w-24 rounded-full mb-6 bg-muted text-muted-foreground">
                  <Camera className="h-10 w-10" />
                </Button>
                <div className="text-center text-sm text-muted-foreground min-h-[4rem] flex items-center justify-center">
                  Snap a photo of the physical page
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-green-500/50 paper-texture animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                Extraction Complete
              </CardTitle>
              <CardDescription>Please confirm the extracted details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="border p-3 rounded bg-background">
                  <div className="text-muted-foreground text-xs uppercase mb-1">Family Name</div>
                  <div className="font-medium">Sharma</div>
                </div>
                <div className="border p-3 rounded bg-background">
                  <div className="text-muted-foreground text-xs uppercase mb-1">Gotra</div>
                  <div className="font-medium">Kashyap</div>
                </div>
                <div className="border p-3 rounded bg-background">
                  <div className="text-muted-foreground text-xs uppercase mb-1">Event Type</div>
                  <div className="font-medium">Shraddh</div>
                </div>
                <div className="border p-3 rounded bg-background">
                  <div className="text-muted-foreground text-xs uppercase mb-1">Tithi</div>
                  <div className="font-medium">Bhadrapada Krishna Dwadashi</div>
                </div>
              </div>
              
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mt-6">
                <p className="text-sm font-medium text-primary mb-2">Resolved to Gregorian Calendar:</p>
                <p className="text-lg font-serif">Friday, September 20, 2026</p>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setSuccess(false)}>Retake</Button>
                <Button className="flex-1" onClick={() => setLocation('/roster')}>Confirm & Save to Ledger</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </Layout>
  );
}
