import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { session } = useAuth();

  const adminAction = async <T,>(action: string, payload?: Record<string, unknown>): Promise<T> => {
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action, payload },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(error.message || "Admin action failed");
    }

    if (!data.success) {
      throw new Error(data.error || "Admin action failed");
    }

    return data.data as T;
  };

  return {
    getModels: () => adminAction<ModelWithStats[]>("get_models"),
    addModel: (model: { name: string; provider: string; version: string; metadata?: Record<string, unknown> }) => 
      adminAction<Model>("add_model", model),
    updateModel: (id: string, updates: Partial<Model>) => 
      adminAction<Model>("update_model", { id, ...updates }),
    toggleModelStatus: (id: string, status: "active" | "disabled") => 
      adminAction<Model>("toggle_model_status", { id, status }),
    deleteModel: (id: string) => 
      adminAction<{ success: boolean }>("delete_model", { id }),
    recalculateRatings: () => 
      adminAction<{ modelsUpdated: number; votesProcessed: number }>("recalculate_ratings"),
    resetRatings: () => 
      adminAction<{ success: boolean; message: string }>("reset_ratings"),
    getSystemHealth: () => 
      adminAction<SystemHealth>("get_system_health"),
    getAdminLogs: (limit?: number) => 
      adminAction<AdminLog[]>("get_admin_logs", { limit }),
  };
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  version: string;
  status: "active" | "disabled";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ModelWithStats extends Model {
  model_stats: {
    rating: number;
    wins: number;
    losses: number;
    ties: number;
    total_battles: number;
  } | null;
}

export interface SystemHealth {
  models: { total: number };
  battles: { total: number };
  votes: { total: number };
  recentLogs: AdminLog[];
}

export interface AdminLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
