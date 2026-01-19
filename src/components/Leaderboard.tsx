import { useEffect, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Swords, Medal, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ModelWithStats {
  id: string;
  name: string;
  provider: string;
  rating: number;
  total_battles: number;
  wins: number;
  losses: number;
  ties: number;
}

// Confidence thresholds based on battle count
const CONFIDENCE_LEVELS = {
  LOW: { min: 0, max: 9, label: "Low", color: "text-yellow-500" },
  MEDIUM: { min: 10, max: 29, label: "Medium", color: "text-blue-400" },
  HIGH: { min: 30, max: Infinity, label: "High", color: "text-green-500" },
} as const;

function getConfidenceLevel(battleCount: number) {
  if (battleCount >= CONFIDENCE_LEVELS.HIGH.min) return CONFIDENCE_LEVELS.HIGH;
  if (battleCount >= CONFIDENCE_LEVELS.MEDIUM.min) return CONFIDENCE_LEVELS.MEDIUM;
  return CONFIDENCE_LEVELS.LOW;
}

export function Leaderboard() {
  const [models, setModels] = useState<ModelWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      // Join models with their precomputed stats for fast reads
      const { data, error } = await supabase
        .from("models")
        .select(`
          id,
          name,
          provider,
          model_stats (
            rating,
            total_battles,
            wins,
            losses,
            ties
          )
        `)
        .eq("status", "active");

      if (!error && data) {
        const modelsWithStats: ModelWithStats[] = data.map((model: any) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          rating: model.model_stats?.rating || 1200,
          total_battles: model.model_stats?.total_battles || 0,
          wins: model.model_stats?.wins || 0,
          losses: model.model_stats?.losses || 0,
          ties: model.model_stats?.ties || 0,
        }));
        
        // Sort by rating descending
        modelsWithStats.sort((a, b) => b.rating - a.rating);
        setModels(modelsWithStats);
      }
      setIsLoading(false);
    };

    fetchModels();

    // Set up real-time subscription for stats updates
    const channel = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "model_stats" },
        () => {
          // Refetch when stats change
          fetchModels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <div className="rank-badge rank-1"><Trophy className="h-5 w-5" /></div>;
    if (rank === 2) return <div className="rank-badge rank-2"><Medal className="h-5 w-5" /></div>;
    if (rank === 3) return <div className="rank-badge rank-3"><Medal className="h-5 w-5" /></div>;
    return <div className="rank-badge bg-secondary text-muted-foreground">{rank}</div>;
  };

  const getWinRate = (wins: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((wins / total) * 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary/50 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary/50 rounded animate-pulse w-32" />
                <div className="h-3 bg-secondary/50 rounded animate-pulse w-24" />
              </div>
              <div className="h-8 w-16 bg-secondary/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="glass-panel overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Model Rankings</h2>
          </div>
          <p className="text-muted-foreground mt-1">
            Ranked by ELO rating based on community votes
          </p>
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-6 py-3 bg-secondary/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="w-10">Rank</div>
          <div>Model</div>
          <div className="text-center w-16">Wins</div>
          <div className="text-center w-16">Losses</div>
          <div className="text-center w-16">Battles</div>
          <div className="text-center w-20">Win Rate</div>
          <div className="text-center w-20">Rating</div>
        </div>

        <div className="divide-y divide-border/30">
          {models.map((model, index) => {
            const confidence = getConfidenceLevel(model.total_battles);
            
            return (
              <div
                key={model.id}
                className="leaderboard-row md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto_auto] md:gap-4 md:items-center"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {getRankBadge(index + 1)}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground capitalize">{model.provider}</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1 text-xs ${confidence.color}`}>
                          <AlertCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">{confidence.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{confidence.label} confidence ({model.total_battles} battles)</p>
                        <p className="text-xs text-muted-foreground">
                          {model.total_battles < 10 
                            ? "Need 10+ battles for medium confidence" 
                            : model.total_battles < 30 
                              ? "Need 30+ battles for high confidence"
                              : "Rating is statistically reliable"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Desktop view - individual columns */}
                <div className="hidden md:flex items-center justify-center w-16">
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">{model.wins}</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center w-16">
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">{model.losses}</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center w-16">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Swords className="h-4 w-4" />
                    <span>{model.total_battles}</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center w-20">
                  <span className="font-medium text-foreground">
                    {getWinRate(model.wins, model.total_battles)}
                  </span>
                </div>

                {/* Mobile view - compact stats */}
                <div className="flex md:hidden items-center gap-4 mt-2 text-sm">
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>{model.wins}W</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="h-3 w-3" />
                    <span>{model.losses}L</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Swords className="h-3 w-3" />
                    <span>{model.total_battles}</span>
                  </div>
                </div>

                <div className="elo-badge md:w-20 md:text-center">
                  {model.rating}
                </div>
              </div>
            );
          })}
        </div>

        {models.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No models ranked yet. Start battling!</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
