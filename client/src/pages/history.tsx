import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, Droplets, Zap, GlassWater, Gauge, Thermometer, Battery, CloudRain } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Player, PlayerSnapshot } from "@shared/schema";
import { format } from "date-fns";

type PeriodOption = 1 | 3 | 7 | 30 | "all";

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: "all", label: "All Time" },
];

interface PlayerWithSnapshot extends Player {
  latestSnapshot: PlayerSnapshot | null;
}

export default function History() {
  const [, params] = useRoute("/history/:id");
  const playerId = params?.id ? parseInt(params.id) : null;
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(7);

  const { data: players } = useQuery<PlayerWithSnapshot[]>({
    queryKey: ["/api/players"],
  });

  const daysParam = selectedPeriod === "all" ? "" : `&days=${selectedPeriod}`;
  
  const { data: snapshots, isLoading } = useQuery<PlayerSnapshot[]>({
    queryKey: ["/api/players", playerId, "snapshots", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/snapshots?limit=10000${daysParam}`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
    enabled: !!playerId,
  });

  const player = players?.find((p) => p.id === playerId);

  if (!playerId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Player not found</p>
      </div>
    );
  }

  const chartData = (snapshots || [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((snapshot) => ({
      time: format(new Date(snapshot.createdAt), "MM/dd HH:mm"),
      fullTime: format(new Date(snapshot.createdAt), "MMM d, yyyy HH:mm"),
      health: snapshot.health,
      blood: snapshot.blood,
      energy: snapshot.energy,
      water: snapshot.water,
      shock: snapshot.shock,
      stamina: snapshot.stamina,
      wetness: snapshot.wetness,
      heatComfort: snapshot.heatComfort,
    }));

  const metrics = [
    {
      title: "Health",
      dataKey: "health",
      color: "hsl(var(--health))",
      icon: Heart,
      domain: [0, 100] as [number, number],
    },
    {
      title: "Blood",
      dataKey: "blood",
      color: "hsl(var(--blood))",
      icon: Droplets,
      domain: [0, 5000] as [number, number],
      suffix: " ml",
    },
    {
      title: "Energy",
      dataKey: "energy",
      color: "hsl(var(--energy))",
      icon: Zap,
      domain: [0, 5000] as [number, number],
    },
    {
      title: "Water",
      dataKey: "water",
      color: "hsl(var(--water))",
      icon: GlassWater,
      domain: [0, 5000] as [number, number],
      suffix: " ml",
    },
    {
      title: "Shock",
      dataKey: "shock",
      color: "hsl(var(--chart-5))",
      icon: Gauge,
      domain: [0, 100] as [number, number],
    },
    {
      title: "Stamina",
      dataKey: "stamina",
      color: "hsl(var(--chart-3))",
      icon: Battery,
      domain: [0, 100] as [number, number],
    },
    {
      title: "Wetness",
      dataKey: "wetness",
      color: "hsl(var(--chart-4))",
      icon: CloudRain,
      domain: [0, 1] as [number, number],
    },
    {
      title: "Heat Comfort",
      dataKey: "heatComfort",
      color: "hsl(var(--chart-2))",
      icon: Thermometer,
      domain: [-100, 100] as [number, number],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4 p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-history-title">
                {player?.name || "Player"} - Full History
              </h1>
              <p className="text-sm text-muted-foreground">
                {snapshots?.length || 0} data points
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedPeriod === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(option.value)}
                data-testid={`button-period-${option.value}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No historical data available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.dataKey} className="overflow-visible">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <metric.icon className="h-5 w-5" style={{ color: metric.color }} />
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64" data-testid={`chart-history-${metric.dataKey}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          tickLine={false}
                          axisLine={false}
                          width={50}
                          domain={metric.domain}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) {
                              return payload[0].payload.fullTime;
                            }
                            return "";
                          }}
                          formatter={(value: number) => [
                            `${value}${metric.suffix || ""}`,
                            metric.title,
                          ]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={metric.dataKey}
                          name={metric.title}
                          stroke={metric.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
