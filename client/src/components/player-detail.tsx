import { Heart, Droplets, Zap, GlassWater, Timer, Footprints, Crosshair, Thermometer, Battery, CloudRain, Gauge, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { HealthMetricCard } from "./health-metric-card";
import { StatCard } from "./stat-card";
import { SecondaryMetric } from "./secondary-metric";
import { HealthChart } from "./health-chart";
import { PositionCard } from "./position-card";
import { DiseaseStatus } from "./disease-status";
import type { Player, PlayerSnapshot } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PlayerDetailProps {
  player: Player;
  latestSnapshot: PlayerSnapshot | null;
  snapshots: PlayerSnapshot[];
  isLoading: boolean;
}

function formatPlaytime(hours: number): string {
  if (hours < 0) return "0h 0m";
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${mins}m`;
}

function formatDistance(meters: number): string {
  if (meters < 0) return "0 km";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getShockStatus(shock: number): { text: string; color: string } {
  if (shock === 0) return { text: "Unconscious", color: "text-destructive" };
  if (shock <= 20) return { text: "Critical", color: "text-destructive" };
  if (shock <= 50) return { text: "Medium", color: "text-yellow-500" };
  return { text: "Optimal", color: "text-success" };
}

function getHeatComfortStatus(value: number): { text: string; color: string } {
  if (value >= -5 && value <= 15) return { text: "Optimal", color: "text-success" };
  if (value >= -30 && value <= 40) return { text: "Moderate", color: "text-yellow-500" };
  return { text: "Extreme", color: "text-destructive" };
}

function getStaminaStatus(value: number): { text: string; color: string } {
  if (value >= 80) return { text: "Optimal", color: "text-success" };
  if (value >= 40) return { text: "Low", color: "text-yellow-500" };
  return { text: "Exhausted", color: "text-destructive" };
}

function getWetnessStatus(value: number): { text: string; color: string } {
  if (value <= 0.1) return { text: "Dry", color: "text-success" };
  if (value <= 0.5) return { text: "Damp", color: "text-yellow-500" };
  return { text: "Soaked", color: "text-destructive" };
}

export function PlayerDetail({ player, latestSnapshot, snapshots, isLoading }: PlayerDetailProps) {
  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (!latestSnapshot) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-muted-foreground">
            Waiting for player data from the DayZ server...
          </p>
        </div>
      </div>
    );
  }

  const isOnline = (Date.now() - new Date(player.lastSeen).getTime()) < 5 * 60 * 1000;
  const lastSeenText = formatDistanceToNow(new Date(player.lastSeen), { addSuffix: true });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" data-testid="text-player-detail-name">{player.name}</h1>
            <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? "bg-success" : ""}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Last seen {lastSeenText}
          </p>
        </div>
        <Button variant="outline" asChild data-testid="button-view-history">
          <Link href={`/history/${player.id}`}>
            <History className="h-4 w-4 mr-2" />
            View Full History
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthMetricCard
          title="Health"
          value={latestSnapshot.health}
          maxValue={100}
          unit="HP"
          icon={Heart}
          colorClass="text-health"
          bgColorClass="bg-health/10"
          optimalMin={75}
          criticalMin={25}
        />
        <HealthMetricCard
          title="Blood"
          value={latestSnapshot.blood}
          maxValue={5000}
          unit="ml"
          icon={Droplets}
          colorClass="text-blood"
          bgColorClass="bg-blood/10"
          optimalMin={4000}
          criticalMin={2500}
        />
        <HealthMetricCard
          title="Energy"
          value={latestSnapshot.energy}
          maxValue={20000}
          unit=""
          icon={Zap}
          colorClass="text-energy"
          bgColorClass="bg-energy/10"
          optimalMin={800}
          criticalMin={300}
        />
        <HealthMetricCard
          title="Water"
          value={latestSnapshot.water}
          maxValue={5000}
          unit="ml"
          icon={GlassWater}
          colorClass="text-water"
          bgColorClass="bg-water/10"
          optimalMin={1200}
          criticalMin={500}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SecondaryMetric
          label="Shock"
          value={latestSnapshot.shock}
          unit=""
          icon={Gauge}
          maxValue={100}
          statusText={getShockStatus(latestSnapshot.shock).text}
          statusColor={getShockStatus(latestSnapshot.shock).color}
        />
        <SecondaryMetric
          label="Heat Comfort"
          value={latestSnapshot.heatComfort}
          unit=""
          icon={Thermometer}
          minValue={-100}
          maxValue={100}
          statusText={getHeatComfortStatus(latestSnapshot.heatComfort).text}
          statusColor={getHeatComfortStatus(latestSnapshot.heatComfort).color}
        />
        <SecondaryMetric
          label="Stamina"
          value={latestSnapshot.stamina}
          unit=""
          icon={Battery}
          maxValue={100}
          statusText={getStaminaStatus(latestSnapshot.stamina).text}
          statusColor={getStaminaStatus(latestSnapshot.stamina).color}
        />
        <SecondaryMetric
          label="Wetness"
          value={latestSnapshot.wetness}
          unit=""
          icon={CloudRain}
          statusText={getWetnessStatus(latestSnapshot.wetness).text}
          statusColor={getWetnessStatus(latestSnapshot.wetness).color}
          maxValue={1}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Playtime"
          value={formatPlaytime(latestSnapshot.playtime)}
          subtitle="Total time in game"
          icon={Timer}
        />
        <StatCard
          title="Distance Walked"
          value={formatDistance(latestSnapshot.distanceWalked)}
          subtitle="Total distance traveled"
          icon={Footprints}
        />
        <StatCard
          title="Zombies Killed"
          value={latestSnapshot.killedZombies < 0 ? "N/A" : latestSnapshot.killedZombies}
          subtitle="Total kills"
          icon={Crosshair}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          snapshots={snapshots}
          title="Health"
          dataKeys={[
            { key: "health", name: "Health", color: "hsl(var(--health))" },
          ]}
          yAxisDomain={[0, 100]}
        />
        <HealthChart
          snapshots={snapshots}
          title="Blood"
          dataKeys={[
            { key: "blood", name: "Blood (ml)", color: "hsl(var(--blood))" },
          ]}
          yAxisDomain={[0, 5000]}
        />
        <HealthChart
          snapshots={snapshots}
          title="Energy"
          dataKeys={[
            { key: "energy", name: "Energy", color: "hsl(var(--energy))" },
          ]}
          yAxisDomain={[0, 20000]}
        />
        <HealthChart
          snapshots={snapshots}
          title="Water"
          dataKeys={[
            { key: "water", name: "Water (ml)", color: "hsl(var(--water))" },
          ]}
          yAxisDomain={[0, 5000]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PositionCard
          x={latestSnapshot.positionX}
          y={latestSnapshot.positionY}
          z={latestSnapshot.positionZ}
        />
        <DiseaseStatus diseases={latestSnapshot.diseases} />
      </div>
    </div>
  );
}
