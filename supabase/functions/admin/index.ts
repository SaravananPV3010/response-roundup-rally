import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminRequest {
  action: string;
  payload?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.log(`User ${user.id} attempted admin action without admin role`);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, payload }: AdminRequest = await req.json();
    console.log(`Admin ${user.email} executing action: ${action}`);

    let result: unknown;

    switch (action) {
      case "get_models": {
        const { data, error } = await supabase
          .from("models")
          .select(`
            *,
            model_stats (
              rating,
              wins,
              losses,
              ties,
              total_battles
            )
          `)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        result = data;
        break;
      }

      case "add_model": {
        const { name, provider, version, metadata } = payload as {
          name: string;
          provider: string;
          version: string;
          metadata?: Record<string, unknown>;
        };

        const { data, error } = await supabase
          .from("models")
          .insert({
            name,
            provider,
            version: version || "1.0",
            metadata: metadata || {},
            status: "active",
          })
          .select()
          .single();

        if (error) throw error;

        // Log action
        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: "add_model",
          target_type: "model",
          target_id: data.id,
          details: { name, provider },
        });

        result = data;
        break;
      }

      case "update_model": {
        const { id, ...updates } = payload as { id: string; [key: string]: unknown };

        const { data, error } = await supabase
          .from("models")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: "update_model",
          target_type: "model",
          target_id: id,
          details: updates,
        });

        result = data;
        break;
      }

      case "toggle_model_status": {
        const { id, status } = payload as { id: string; status: "active" | "disabled" };

        const { data, error } = await supabase
          .from("models")
          .update({ status })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: status === "active" ? "enable_model" : "disable_model",
          target_type: "model",
          target_id: id,
          details: { status },
        });

        result = data;
        break;
      }

      case "delete_model": {
        const { id } = payload as { id: string };

        // First delete stats
        await supabase.from("model_stats").delete().eq("model_id", id);

        const { error } = await supabase
          .from("models")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: "delete_model",
          target_type: "model",
          target_id: id,
          details: {},
        });

        result = { success: true };
        break;
      }

      case "recalculate_ratings": {
        // Trigger the recalculate-ratings function
        const { data, error } = await supabase.functions.invoke("recalculate-ratings");
        
        if (error) throw error;

        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: "recalculate_ratings",
          target_type: "system",
          target_id: null,
          details: data,
        });

        result = data;
        break;
      }

      case "reset_ratings": {
        // Reset all model stats to default
        const { error } = await supabase
          .from("model_stats")
          .update({
            rating: 1200,
            wins: 0,
            losses: 0,
            ties: 0,
            total_battles: 0,
          })
          .neq("model_id", "00000000-0000-0000-0000-000000000000"); // Match all

        if (error) throw error;

        await supabase.from("admin_logs").insert({
          admin_user_id: user.id,
          action: "reset_ratings",
          target_type: "system",
          target_id: null,
          details: {},
        });

        result = { success: true, message: "All ratings reset to 1200" };
        break;
      }

      case "get_system_health": {
        // Get various health metrics
        const [modelsResult, battlesResult, votesResult, logsResult] = await Promise.all([
          supabase.from("models").select("id", { count: "exact" }),
          supabase.from("battles").select("id", { count: "exact" }),
          supabase.from("votes").select("id", { count: "exact" }),
          supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(10),
        ]);

        result = {
          models: {
            total: modelsResult.count || 0,
          },
          battles: {
            total: battlesResult.count || 0,
          },
          votes: {
            total: votesResult.count || 0,
          },
          recentLogs: logsResult.data || [],
        };
        break;
      }

      case "get_admin_logs": {
        const { limit = 50 } = payload as { limit?: number };
        
        const { data, error } = await supabase
          .from("admin_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        result = data;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
