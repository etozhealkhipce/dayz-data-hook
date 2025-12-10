import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SecondaryMetricProps {
  label: string;
  value: number;
  unit: string;
  icon: LucideIcon;
  minValue?: number;
  maxValue?: number;
}

export function SecondaryMetric({
  label,
  value,
  unit,
  icon: Icon,
  minValue = 0,
  maxValue,
}: SecondaryMetricProps) {
  const displayValue = Math.round(value * 100) / 100;
  const range = maxValue !== undefined ? maxValue - minValue : null;
  const percentage = range !== null ? Math.min(Math.max(((value - minValue) / range) * 100, 0), 100) : null;

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-md bg-muted shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
            <div className="flex items-center gap-3">
              {percentage !== null && (
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, percentage)}%` }}
                  />
                </div>
              )}
              <span className="font-mono text-sm font-medium whitespace-nowrap" data-testid={`text-secondary-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                {displayValue}{unit}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
