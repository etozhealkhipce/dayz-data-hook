import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Heart, ShieldCheck, Skull } from "lucide-react";

interface DiseaseStatusProps {
  diseases: string[];
}

const diseaseInfo: Record<string, { severity: "low" | "medium" | "high"; icon: typeof AlertTriangle }> = {
  cholera: { severity: "high", icon: Skull },
  influenza: { severity: "medium", icon: AlertTriangle },
  salmonella: { severity: "medium", icon: AlertTriangle },
  wound_infection: { severity: "high", icon: Skull },
  brain_disease: { severity: "high", icon: Skull },
  hemolytic_reaction: { severity: "high", icon: Skull },
};

function getSeverityColor(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "low":
      return "bg-warning text-warning-foreground";
    case "medium":
      return "bg-energy text-energy-foreground";
    case "high":
      return "bg-health text-health-foreground";
  }
}

export function DiseaseStatus({ diseases }: DiseaseStatusProps) {
  const isHealthy = diseases.length === 0;

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {isHealthy ? (
            <>
              <ShieldCheck className="h-5 w-5 text-success" />
              Health Status
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-health" />
              Active Conditions
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isHealthy ? (
          <div className="flex items-center gap-3 p-4 bg-success/10 rounded-md" data-testid="status-healthy">
            <Heart className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium text-success">Healthy</p>
              <p className="text-sm text-muted-foreground">No active diseases or conditions</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2" data-testid="status-diseases">
            {diseases.map((disease, index) => {
              const info = diseaseInfo[disease.toLowerCase()] || { severity: "medium", icon: AlertTriangle };
              const Icon = info.icon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`disease-${disease}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-health" />
                    <span className="font-medium capitalize">
                      {disease.replace(/_/g, " ")}
                    </span>
                  </div>
                  <Badge className={getSeverityColor(info.severity)}>
                    {info.severity}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
