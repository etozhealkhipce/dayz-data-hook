import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";

interface HealthMetricCardProps {
  title: string;
  value: number;
  maxValue: number;
  unit: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  showProgress?: boolean;
  optimalMin?: number;
  criticalMin?: number;
}

function getHealthStatus(value: number, optimalMin: number, criticalMin: number): { text: string; color: string } {
  if (value >= optimalMin) return { text: "Optimal", color: "text-success" };
  if (value >= criticalMin) return { text: "Low", color: "text-yellow-500" };
  return { text: "Critical", color: "text-destructive" };
}

export function HealthMetricCard({
  title,
  value,
  maxValue,
  unit,
  icon: Icon,
  colorClass,
  bgColorClass,
  showProgress = true,
  optimalMin,
  criticalMin,
}: HealthMetricCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const displayValue = value < 0 ? 0 : Math.round(value * 10) / 10;
  const status = optimalMin !== undefined && criticalMin !== undefined 
    ? getHealthStatus(value, optimalMin, criticalMin) 
    : null;

  return (
    <Card className="overflow-visible">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-md ${bgColorClass}`}>
            <Icon className={`h-6 w-6 ${colorClass}`} />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold font-mono mt-1" data-testid={`text-metric-${title.toLowerCase()}`}>
              {displayValue.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </p>
          </div>
        </div>
        {showProgress && (
          <div className="space-y-1">
            <Progress 
              value={percentage} 
              className="h-2"
              style={{ 
                '--progress-background': `hsl(var(--${title.toLowerCase()}))` 
              } as React.CSSProperties}
            />
            <div className="flex items-center justify-between">
              {status && (
                <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
              )}
              <p className="text-xs text-muted-foreground text-right flex-1">
                {Math.round(percentage)}% of max
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
