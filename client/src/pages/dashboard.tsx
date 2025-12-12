import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Server, Users, Copy, RefreshCw, Trash2, LogOut, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ServerWithPlayerCount } from "@shared/schema";

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newServerName, setNewServerName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: servers, isLoading } = useQuery<ServerWithPlayerCount[]>({
    queryKey: ["/api/servers"],
    enabled: !!user,
  });

  const createServerMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/servers", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setNewServerName("");
      setDialogOpen(false);
      toast({ title: "Server created successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create server", description: error.message });
    },
  });

  const regenerateWebhookMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const res = await apiRequest("POST", `/api/servers/${serverId}/regenerate-webhook`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({ title: "Webhook URL regenerated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to regenerate webhook", description: error.message });
    },
  });

  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      await apiRequest("DELETE", `/api/servers/${serverId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({ title: "Server deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete server", description: error.message });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const copyWebhookUrl = (webhookId: string) => {
    const url = `${window.location.origin}/api/webhook/${webhookId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Webhook URL copied to clipboard" });
  };

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">DayZ Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Your Servers</h2>
            <p className="text-muted-foreground">Manage your DayZ server tracking</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-server">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Server</DialogTitle>
                <DialogDescription>
                  Create a new server to start tracking player health data.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Server name (e.g., My DayZ Server)"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  data-testid="input-server-name"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createServerMutation.mutate(newServerName)}
                  disabled={!newServerName.trim() || createServerMutation.isPending}
                  data-testid="button-create-server"
                >
                  {createServerMutation.isPending ? "Creating..." : "Create Server"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : servers?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No servers yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first server to start tracking player health data.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Server
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servers?.map((server) => (
              <Card key={server.id} data-testid={`card-server-${server.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {server.name}
                        {server.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {server.playerCount} players tracked
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Webhook URL</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-muted p-2 rounded-md truncate">
                        /api/webhook/{server.webhookId.slice(0, 8)}...
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyWebhookUrl(server.webhookId)}
                        title="Copy webhook URL"
                        data-testid={`button-copy-webhook-${server.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/server/${server.id}`} data-testid={`link-view-players-${server.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Players
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateWebhookMutation.mutate(server.id)}
                      disabled={regenerateWebhookMutation.isPending}
                      data-testid={`button-regenerate-webhook-${server.id}`}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Regenerate
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" data-testid={`button-delete-server-${server.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete server?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{server.name}" and all its player data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteServerMutation.mutate(server.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
