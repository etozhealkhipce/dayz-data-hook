import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, Droplets, Zap, GlassWater, Gauge, Thermometer } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PlayerSnapshot } from "@shared/schema";
import { format } from "date-fns";
import { ThemeToggle } from "@/components/theme-toggle";

type PeriodOption = 1 | 3 | 7 | 30 | "all";

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: "all", label: "All Time" },
];

export default function History() {
  const [, params] = useRoute("/server/:serverId/history/:playerId");
  const serverId = params?.serverId ? parseInt(params.serverId) : null;
  const playerId = params?.playerId ? parseInt(params.playerId) : null;
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(7);
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const daysParam = selectedPeriod === "all" ? "" : `&days=${selectedPeriod}`;
  
  const { data: snapshots, isLoading } = useQuery<PlayerSnapshot[]>({
    queryKey: ["/api/servers", serverId, "players", playerId, "snapshots", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/servers/${serverId}/players/${playerId}/snapshots?limit=10000${daysParam}`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
    enabled: !!user && !!serverId && !!playerId,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (!serverId || !playerId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Invalid URL</p>
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
      title: "Heat Comfort",
      dataKey: "heatComfort",
      color: "hsl(var(--chart-3))",
      icon: Thermometer,
      domain: [-100, 100] as [number, number],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/server/${serverId}`} data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Player History</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
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

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No data available for this period</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics.map((metric) => (
              <Card key={metric.dataKey} className="overflow-visible">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <metric.icon className="h-5 w-5" style={{ color: metric.color }} />
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64" data-testid={`chart-${metric.dataKey}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground"
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          className="text-muted-foreground"
                          domain={metric.domain}
                          tickFormatter={(value) => `${value}${metric.suffix || ""}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.375rem",
                          }}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              return payload[0].payload.fullTime;
                            }
                            return label;
                          }}
                          formatter={(value: number) => [
                            `${Math.round(value * 100) / 100}${metric.suffix || ""}`,
                            metric.title,
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey={metric.dataKey}
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

        <p className="text-sm text-muted-foreground mt-6 text-center">
          Showing {chartData.length} data points
        </p>
      </main>
    </div>
  );
}
