import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PlayerSidebar } from "@/components/player-sidebar";
import { PlayerDetail } from "@/components/player-detail";
import { ThemeToggle } from "@/components/theme-toggle";
import { Activity, Heart } from "lucide-react";
import type { PlayerWithLatestSnapshot, PlayerSnapshot } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const { data: players = [], isLoading: playersLoading } = useQuery<
    PlayerWithLatestSnapshot[]
  >({
    queryKey: ["/api/players"],
    refetchInterval: 30000,
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<
    PlayerSnapshot[]
  >({
    queryKey: ["/api/players", selectedPlayerId, "snapshots"],
    enabled: selectedPlayerId !== null,
    refetchInterval: 30000,
  });

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  const lastUpdate =
    players.length > 0
      ? formatDistanceToNow(
          new Date(
            Math.max(...players.map((p) => new Date(p.lastSeen).getTime())),
          ),
          { addSuffix: true },
        )
      : null;

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <PlayerSidebar
          players={players}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={setSelectedPlayerId}
          isLoading={playersLoading}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden sm:flex items-center gap-2">
                <Activity className="h-5 w-5 text-chart-1" />
                <span className="font-semibold">Player Health Tracker</span>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            {selectedPlayer ? (
              <PlayerDetail
                player={selectedPlayer}
                latestSnapshot={selectedPlayer.latestSnapshot}
                snapshots={snapshots}
                isLoading={snapshotsLoading}
              />
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                  <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">
                    No Player Selected
                  </h2>
                  <p className="text-muted-foreground">
                    {players.length === 0
                      ? "Waiting for data from your DayZ server..."
                      : "Select a player from the sidebar to view their stats"}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
