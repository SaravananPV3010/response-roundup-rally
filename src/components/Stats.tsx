import { useEffect, useState } from "react";
import { Swords, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function Stats() {
  const [stats, setStats] = useState({
    totalBattles: 0,
    totalVotes: 0,
    activeModels: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [battlesResult, votesResult, modelsResult] = await Promise.all([
        supabase.from("battles").select("id", { count: "exact" }),
        supabase.from("votes").select("id", { count: "exact" }),
        supabase.from("models").select("id", { count: "exact" }).eq("status", "active"),
      ]);

      setStats({
        totalBattles: battlesResult.count || 0,
        totalVotes: votesResult.count || 0,
        activeModels: modelsResult.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      label: "Total Battles",
      value: stats.totalBattles,
      icon: Swords,
      color: "text-primary",
    },
    {
      label: "Votes Cast",
      value: stats.totalVotes,
      icon: Users,
      color: "text-model-b",
    },
    {
      label: "Active Models",
      value: stats.activeModels,
      icon: Zap,
      color: "text-tie",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((item) => (
        <div key={item.label} className="glass-panel p-4 text-center animate-fade-in">
          <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
          <p className="text-2xl font-bold text-foreground">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
