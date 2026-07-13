import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { Mic, ArrowRight, CheckCircle2, StopCircle } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const handleMicClick = () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      setTimeout(() => {
        setProcessing(false);
        setStep(3); // Go to final step
      }, 2500);
    } else {
      setRecording(true);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <h1 className="font-serif text-5xl text-primary mb-2">स्मरण</h1>
          <p className="text-muted-foreground uppercase tracking-widest text-sm">Smaran</p>
        </div>

        {step === 1 && (
          <Card className="paper-texture border-primary/20 animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Pranam, Pandit-ji.</CardTitle>
              <CardDescription>Let's set up your private practice ledger.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input placeholder="e.g. Pt. Rameshwar Shastri" />
              </div>
              <div className="space-y-2">
                <Label>City of Practice</Label>
                <Input placeholder="e.g. Varanasi" />
              </div>
              <div className="space-y-2">
                <Label>Dakshina UPI ID</Label>
                <Input placeholder="your.name@upi" />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Calendar System</Label>
                <div className="flex gap-4 mt-1">
                  <Button variant="default" className="flex-1">Purnimanta (North)</Button>
                  <Button variant="outline" className="flex-1 text-muted-foreground">Amanta (South)</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-primary/20 animate-in fade-in slide-in-from-right-8">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Your First Family</CardTitle>
              <CardDescription>Speak one entry from your bahi khata.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
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
                {processing && <p className="text-primary font-medium animate-pulse">Consulting Panchang...</p>}
                {!recording && !processing && (
                  <p className="text-muted-foreground italic">"Sharma parivar, gotra Kashyap, pitaji ki punyatithi Bhadrapada Krishna Dwadashi"</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="font-serif text-3xl mb-2">Practice Secured</h2>
              <p className="text-muted-foreground">Your first tithi has been resolved.</p>
            </div>
            
            <Card className="bg-primary text-primary-foreground border-none shadow-xl transform rotate-1">
              <CardContent className="p-8">
                <div className="text-sm font-medium opacity-80 mb-1">Upcoming Ritual</div>
                <div className="text-3xl font-serif mb-6">Shraddh for Sharma Parivar</div>
                <div className="space-y-2 text-primary-foreground/90">
                  <div className="flex justify-between border-b border-primary-foreground/20 pb-2">
                    <span>Gotra</span>
                    <span className="font-serif italic text-lg">Kashyap</span>
                  </div>
                  <div className="flex justify-between border-b border-primary-foreground/20 pb-2 pt-2">
                    <span>Tithi</span>
                    <span>Bhadrapada Krishna Dwadashi</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span>This Year</span>
                    <span className="font-bold">Friday, Sep 20</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full bg-foreground text-background hover:bg-foreground/90" size="lg" onClick={() => setLocation("/")}>
              Enter Smaran
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
