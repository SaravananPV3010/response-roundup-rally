import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, ModelWithStats, SystemHealth, AdminLog } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Power, 
  RefreshCw, 
  RotateCcw,
  Activity,
  Database,
  Swords,
  Vote,
  Clock,
  Shield,
  Loader2,
  LogOut,
} from "lucide-react";

const AdminPage = () => {
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const admin = useAdmin();

  const [models, setModels] = useState<ModelWithStats[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add model form state
  const [newModel, setNewModel] = useState({
    name: "",
    provider: "anthropic" as string,
    version: "1.0",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (!authLoading && user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modelsData, healthData, logsData] = await Promise.all([
        admin.getModels(),
        admin.getSystemHealth(),
        admin.getAdminLogs(20),
      ]);
      setModels(modelsData);
      setHealth(healthData);
      setLogs(logsData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModel = async () => {
    setActionLoading("add");
    try {
      await admin.addModel(newModel);
      toast({ title: "Model Added", description: `${newModel.name} has been added.` });
      setNewModel({ name: "", provider: "anthropic", version: "1.0" });
      setIsAddDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add model",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (model: ModelWithStats) => {
    const newStatus = model.status === "active" ? "disabled" : "active";
    setActionLoading(model.id);
    try {
      await admin.toggleModelStatus(model.id, newStatus);
      toast({ 
        title: "Status Updated", 
        description: `${model.name} is now ${newStatus}.` 
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteModel = async (model: ModelWithStats) => {
    setActionLoading(model.id);
    try {
      await admin.deleteModel(model.id);
      toast({ title: "Model Deleted", description: `${model.name} has been removed.` });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete model",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecalculateRatings = async () => {
    setActionLoading("recalculate");
    try {
      const result = await admin.recalculateRatings();
      toast({ 
        title: "Ratings Recalculated", 
        description: `Processed ${result.votesProcessed} votes for ${result.modelsUpdated} models.` 
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to recalculate ratings",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetRatings = async () => {
    setActionLoading("reset");
    try {
      await admin.resetRatings();
      toast({ 
        title: "Ratings Reset", 
        description: "All model ratings have been reset to 1200." 
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset ratings",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Logged in as {user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* System Health Cards */}
          {health && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-6">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{health.models.total}</p>
                    <p className="text-sm text-muted-foreground">Models</p>
                  </div>
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="flex items-center gap-3">
                  <Swords className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold">{health.battles.total}</p>
                    <p className="text-sm text-muted-foreground">Battles</p>
                  </div>
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="flex items-center gap-3">
                  <Vote className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold">{health.votes.total}</p>
                    <p className="text-sm text-muted-foreground">Votes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="models" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
              <TabsTrigger value="logs">Activity Logs</TabsTrigger>
            </TabsList>

            {/* Models Tab */}
            <TabsContent value="models" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Model Management</h2>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Model</DialogTitle>
                      <DialogDescription>
                        Add a new AI model to the battle arena.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Model Name</Label>
                        <Input
                          id="name"
                          value={newModel.name}
                          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                          placeholder="e.g., Claude 3.5 Sonnet"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Select
                          value={newModel.provider}
                          onValueChange={(value) => setNewModel({ ...newModel, provider: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="gemini">Google (Gemini)</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="version">Version</Label>
                        <Input
                          id="version"
                          value={newModel.version}
                          onChange={(e) => setNewModel({ ...newModel, version: e.target.value })}
                          placeholder="e.g., 1.0"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleAddModel}
                        disabled={!newModel.name || actionLoading === "add"}
                      >
                        {actionLoading === "add" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add Model
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="glass-panel divide-y divide-border/30">
                {models.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No models found. Add one to get started.
                  </div>
                ) : (
                  models.map((model) => (
                    <div key={model.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{model.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            model.status === "active" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {model.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {model.provider} • v{model.version}
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="text-center">
                          <p className="font-mono text-foreground">{model.model_stats?.rating || 1200}</p>
                          <p className="text-xs">Rating</p>
                        </div>
                        <div className="text-center">
                          <p className="font-mono text-foreground">{model.model_stats?.total_battles || 0}</p>
                          <p className="text-xs">Battles</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(model)}
                          disabled={actionLoading === model.id}
                        >
                          {actionLoading === model.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className={`h-4 w-4 ${model.status === "active" ? "text-green-400" : "text-red-400"}`} />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Model</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{model.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteModel(model)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Ratings Tab */}
            <TabsContent value="ratings" className="space-y-4">
              <h2 className="text-xl font-semibold">Rating Management</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-panel p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <RefreshCw className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Recalculate Ratings</h3>
                      <p className="text-sm text-muted-foreground">
                        Recompute all ratings from stored vote data
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleRecalculateRatings}
                    disabled={actionLoading === "recalculate"}
                    className="w-full"
                  >
                    {actionLoading === "recalculate" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Recalculate All Ratings
                  </Button>
                </div>

                <div className="glass-panel p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <RotateCcw className="h-6 w-6 text-destructive" />
                    <div>
                      <h3 className="font-semibold">Reset Ratings</h3>
                      <p className="text-sm text-muted-foreground">
                        Reset all model ratings to default (1200)
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        Reset All Ratings
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset All Ratings</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset all model ratings, wins, losses, and battle counts to zero. 
                          Vote history will be preserved. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetRatings}>
                          {actionLoading === "reset" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Reset Ratings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Activity Logs</h2>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="glass-panel divide-y divide-border/30">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No activity logs yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4">
                      <Activity className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {log.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.target_type}: {log.target_id || "N/A"}
                        </p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
