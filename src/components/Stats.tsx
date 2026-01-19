import { useEffect, useState } from "react";
import { Swords, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  totalBattles: number;
  totalVotes: number;
  activeModels: number;
}

export function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [battlesResult, votesResult, modelsResult] = await Promise.all([
          supabase.from("battles").select("id", { count: "exact", head: true }),
          supabase.from("votes").select("id", { count: "exact", head: true }),
          supabase.from("models").select("id", { count: "exact", head: true }).eq("status", "active"),
        ]);

        setStats({
          totalBattles: battlesResult.count || 0,
          totalVotes: votesResult.count || 0,
          activeModels: modelsResult.count || 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      label: "Total Battles",
      value: stats?.totalBattles ?? 0,
      icon: Swords,
      color: "text-primary",
    },
    {
      label: "Votes Cast",
      value: stats?.totalVotes ?? 0,
      icon: Users,
      color: "text-model-b",
    },
    {
      label: "Active Models",
      value: stats?.activeModels ?? 0,
      icon: Zap,
      color: "text-tie",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className="glass-panel p-4 text-center animate-fade-in">
          <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
          {isLoading ? (
            <div className="h-8 w-12 mx-auto bg-secondary/50 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
          )}
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
