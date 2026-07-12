import { useState } from "react";
import { useSendWhatsappMessage, useListWhatsappMessages, getListWhatsappMessagesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send } from "lucide-react";

export function WhatsappTestPanel() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Pranam! This is a test message from Smaran.");
  const [feedback, setFeedback] = useState<string | null>(null);

  const sendMutation = useSendWhatsappMessage();
  const { data: messages, isLoading } = useListWhatsappMessages({
    query: { queryKey: getListWhatsappMessagesQueryKey(), refetchInterval: 5000 },
  });

  const handleSend = () => {
    setFeedback(null);
    sendMutation.mutate(
      { data: { to, message } },
      {
        onSuccess: () => setFeedback("Sent. Meta will only deliver this if the recipient messaged your test number within the last 24 hours."),
        onError: (err: any) => setFeedback(err?.data?.error ?? "Failed to send. Check your WhatsApp credentials."),
      },
    );
  };

  return (
    <Card className="paper-texture border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          WhatsApp Test Layer (Meta Cloud API)
        </CardTitle>
        <CardDescription>
          Message your Meta test number from your phone first to open a free 24-hour service window, then send a reply here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Recipient (E.164, e.g. +919876543210)</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+91..." />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button onClick={handleSend} disabled={sendMutation.isPending || !to || !message}>
            <Send className="h-4 w-4 mr-2" />
            {sendMutation.isPending ? "Sending…" : "Send test message"}
          </Button>
          {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="text-sm font-medium mb-2">Recently received messages</p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !messages || messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Send a WhatsApp message to your test number to see it appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {messages.map((m, i) => (
                <li key={i} className="text-sm bg-accent/30 rounded-md px-3 py-2 flex justify-between">
                  <span><span className="font-medium">{m.from}</span>: {m.text}</span>
                  <span className="text-xs text-muted-foreground">{new Date(m.receivedAt).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
