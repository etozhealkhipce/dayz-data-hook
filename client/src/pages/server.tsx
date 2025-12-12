import { useQuery } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { PlayerDetail } from "@/components/player-detail";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PlayerWithLatestSnapshot, PlayerSnapshot } from "@shared/schema";

export default function ServerPage() {
  const [, params] = useRoute("/server/:id");
  const serverId = params?.id ? parseInt(params.id, 10) : null;
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: players, isLoading: playersLoading } = useQuery<PlayerWithLatestSnapshot[]>({
    queryKey: ["/api/servers", serverId, "players"],
    queryFn: async () => {
      const res = await fetch(`/api/servers/${serverId}/players`);
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
    enabled: !!user && !!serverId,
    refetchInterval: 30000,
  });

  const { data: snapshots } = useQuery<PlayerSnapshot[]>({
    queryKey: ["/api/servers", serverId, "players", selectedPlayerId, "snapshots"],
    queryFn: async () => {
      const res = await fetch(`/api/servers/${serverId}/players/${selectedPlayerId}/snapshots?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
    enabled: !!user && !!serverId && !!selectedPlayerId,
    refetchInterval: 30000,
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

  const filteredPlayers = players?.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPlayer = players?.find((p) => p.id === selectedPlayerId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Players</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r flex flex-col bg-sidebar">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-players"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {playersLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredPlayers?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {searchQuery ? "No players match your search" : "No players yet. Waiting for webhook data..."}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPlayers?.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors hover-elevate ${
                      selectedPlayerId === player.id ? "bg-sidebar-accent" : ""
                    }`}
                    data-testid={`button-player-${player.id}`}
                  >
                    <div className="font-medium truncate">{player.name}</div>
                    {player.latestSnapshot && (
                      <div className="text-xs text-muted-foreground mt-1">
                        HP: {Math.round(player.latestSnapshot.health)}% | 
                        Blood: {Math.round(player.latestSnapshot.blood)}ml
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {!selectedPlayer ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Select a player from the sidebar to view their stats
                </p>
              </CardContent>
            </Card>
          ) : (
            <PlayerDetail
              player={selectedPlayer}
              latestSnapshot={selectedPlayer.latestSnapshot}
              snapshots={snapshots || []}
              isLoading={false}
              serverId={serverId!}
            />
          )}
        </main>
      </div>
    </div>
  );
}
