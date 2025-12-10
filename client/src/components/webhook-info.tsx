import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Link2, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookInfoProps {
  lastUpdate: string | null;
}

export function WebhookInfo({ lastUpdate }: WebhookInfoProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const webhookUrl = `${window.location.origin}/api/webhook`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-chart-1/10">
              <Server className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-sm font-medium">Webhook Endpoint</p>
              <div className="flex items-center gap-2 mt-1">
                <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono truncate max-w-[300px]" data-testid="text-webhook-url">
                  {webhookUrl}
                </code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                Last update: {lastUpdate}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
              data-testid="button-copy-webhook"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
