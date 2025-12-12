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
import { Plus, Server, Users, Copy, RefreshCw, Trash2, LogOut, ExternalLink, Settings, AlertCircle, UserPlus, Crown, X } from "lucide-react";
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
import type { ServerWithAdmins } from "@shared/schema";

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newServerName, setNewServerName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: servers, isLoading } = useQuery<ServerWithAdmins[]>({
    queryKey: ["/api/servers"],
    enabled: !!user,
  });

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerWithAdmins | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");

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

  const addAdminMutation = useMutation({
    mutationFn: async ({ serverId, email }: { serverId: number; email: string }) => {
      const res = await apiRequest("POST", `/api/servers/${serverId}/admins`, { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setNewAdminEmail("");
      toast({ title: "Admin added successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to add admin", description: error.message });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async ({ serverId, adminId }: { serverId: number; adminId: number }) => {
      await apiRequest("DELETE", `/api/servers/${serverId}/admins/${adminId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({ title: "Admin removed" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to remove admin", description: error.message });
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
            <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")} data-testid="button-settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!user.isEmailVerified && (
          <div className="mb-6 p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md flex items-center justify-between gap-4 flex-wrap" data-testid="banner-email-verification">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Verify your email address</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Please verify your email to unlock all features.</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/settings")}
              className="border-amber-400 text-amber-700 dark:border-amber-600 dark:text-amber-300"
              data-testid="button-verify-email-banner"
            >
              Verify Now
            </Button>
          </div>
        )}

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
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {server.name}
                        {server.isOwner && <Badge variant="default" className="text-xs"><Crown className="h-3 w-3 mr-1" />Owner</Badge>}
                        {!server.isOwner && <Badge variant="outline" className="text-xs">Member</Badge>}
                        {server.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {server.playerCount} players
                        </span>
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {(server.admins?.length || 0) + 1} admins
                        </span>
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
                    {server.isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedServer(server);
                          setAdminDialogOpen(true);
                        }}
                        data-testid={`button-manage-admins-${server.id}`}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Admins
                      </Button>
                    )}
                    {server.isOwner && (
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
                    )}
                    {server.isOwner && (
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
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={adminDialogOpen} onOpenChange={(open) => {
          setAdminDialogOpen(open);
          if (!open) {
            setSelectedServer(null);
            setNewAdminEmail("");
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Admins - {selectedServer?.name}</DialogTitle>
              <DialogDescription>
                Add or remove admins who can view this server's player data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Admins</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div>
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Badge><Crown className="h-3 w-3 mr-1" />Owner</Badge>
                  </div>
                  {selectedServer?.admins?.map((admin) => (
                    <div key={admin.adminId} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <p className="text-sm font-medium">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAdminMutation.mutate({ serverId: selectedServer.id, adminId: admin.adminId })}
                        disabled={removeAdminMutation.isPending}
                        data-testid={`button-remove-admin-${admin.adminId}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Add Admin</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Admin email address"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    data-testid="input-admin-email"
                  />
                  <Button
                    onClick={() => {
                      if (selectedServer) {
                        addAdminMutation.mutate({ serverId: selectedServer.id, email: newAdminEmail });
                      }
                    }}
                    disabled={!newAdminEmail.trim() || addAdminMutation.isPending}
                    data-testid="button-add-admin"
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The user must already have an account to be added as admin.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
