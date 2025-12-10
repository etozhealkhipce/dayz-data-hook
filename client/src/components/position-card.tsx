import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

interface PositionCardProps {
  x: number;
  y: number;
  z: number;
}

export function PositionCard({ x, y, z }: PositionCardProps) {
  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-chart-1" />
          Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">X</p>
            <p className="font-mono font-bold text-sm" data-testid="text-position-x">
              {Math.round(x)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Y</p>
            <p className="font-mono font-bold text-sm" data-testid="text-position-y">
              {Math.round(y)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Z</p>
            <p className="font-mono font-bold text-sm" data-testid="text-position-z">
              {Math.round(z)}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-md">
          <div className="relative w-full aspect-square max-w-[200px] mx-auto">
            <div className="absolute inset-0 border border-dashed border-muted-foreground/30 rounded-md">
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border border-muted-foreground/10" />
                ))}
              </div>
              <div
                className="absolute w-3 h-3 bg-chart-1 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                style={{
                  left: `${Math.min(Math.max((x / 15360) * 100, 5), 95)}%`,
                  top: `${Math.min(Math.max(100 - (z / 15360) * 100, 5), 95)}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
            <Navigation className="h-3 w-3" />
            <span>Chernarus Map Grid</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
