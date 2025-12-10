import { useState } from "react";
import { Search, Users, Clock, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import type { PlayerWithLatestSnapshot } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PlayerSidebarProps {
  players: PlayerWithLatestSnapshot[];
  selectedPlayerId: number | null;
  onSelectPlayer: (id: number) => void;
  isLoading: boolean;
}

function getHealthStatus(health: number): { label: string; color: string } {
  if (health >= 75) return { label: "Healthy", color: "bg-success" };
  if (health >= 50) return { label: "Wounded", color: "bg-warning" };
  return { label: "Critical", color: "bg-health" };
}

function PlayerCard({
  player,
  isSelected,
  onClick,
}: {
  player: PlayerWithLatestSnapshot;
  isSelected: boolean;
  onClick: () => void;
}) {
  const health = player.latestSnapshot?.health ?? 0;
  const status = getHealthStatus(health);
  const lastSeen = player.lastSeen ? formatDistanceToNow(new Date(player.lastSeen), { addSuffix: true }) : "Unknown";
  const isOnline = player.lastSeen && (Date.now() - new Date(player.lastSeen).getTime()) < 5 * 60 * 1000;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onClick}
        isActive={isSelected}
        className="h-auto py-3 px-3"
        data-testid={`button-player-${player.id}`}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {player.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar ${
                isOnline ? "bg-success" : "bg-muted-foreground"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate text-sm" data-testid={`text-player-name-${player.id}`}>
                {player.name}
              </span>
              <Badge variant="secondary" className={`${status.color} text-white text-xs shrink-0`}>
                {Math.round(health)}%
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3" />
              <span className="truncate">{lastSeen}</span>
            </div>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function PlayerSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function PlayerSidebar({
  players,
  selectedPlayerId,
  onSelectPlayer,
  isLoading,
}: PlayerSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.steamId.toLowerCase().includes(search.toLowerCase())
  );

  const onlinePlayers = filteredPlayers.filter(
    (p) => p.lastSeen && (Date.now() - new Date(p.lastSeen).getTime()) < 5 * 60 * 1000
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-sidebar-primary" />
          <h1 className="font-bold text-lg">DayZ Health</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border"
            data-testid="input-search-players"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-140px)]">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players
              </span>
              <Badge variant="secondary" className="text-xs">
                {onlinePlayers.length} online
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <>
                    <PlayerSkeleton />
                    <PlayerSkeleton />
                    <PlayerSkeleton />
                  </>
                ) : filteredPlayers.length === 0 ? (
                  <div className="px-3 py-8 text-center text-muted-foreground text-sm">
                    {search ? "No players found" : "No players yet. Waiting for data..."}
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isSelected={selectedPlayerId === player.id}
                      onClick={() => onSelectPlayer(player.id)}
                    />
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
