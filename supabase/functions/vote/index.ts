import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoteRequest {
  battleId: string;
  vote: "left" | "right" | null; // null = tie
  sessionId: string;
}

// K-factor for Elo calculation - can be adjusted for algorithm tuning
const K_FACTOR = 32;

// Calculate expected score using Elo formula
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
}

// Calculate new Elo rating
function calculateNewRating(currentRating: number, expectedScore: number, actualScore: number): number {
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
}

// Handle tie stats update (both models get 0.5 score)
async function updateTieStats(
  supabase: SupabaseClient,
  modelLeftId: string,
  modelRightId: string,
  leftRating: number,
  rightRating: number
): Promise<void> {
  const expectedLeft = calculateExpectedScore(leftRating, rightRating);
  const expectedRight = calculateExpectedScore(rightRating, leftRating);
  
  // For a tie, actual score is 0.5 for both
  const newLeftRating = calculateNewRating(leftRating, expectedLeft, 0.5);
  const newRightRating = calculateNewRating(rightRating, expectedRight, 0.5);
  
  console.log(`Processing tie: Left ${leftRating} -> ${newLeftRating}, Right ${rightRating} -> ${newRightRating}`);
  
  // Update left model stats - fetch first, then update or insert
  const { data: leftStats } = await supabase
    .from("model_stats")
    .select("ties, total_battles")
    .eq("model_id", modelLeftId)
    .maybeSingle();
  
  if (leftStats) {
    await supabase
      .from("model_stats")
      .update({
        ties: leftStats.ties + 1,
        total_battles: leftStats.total_battles + 1,
        rating: newLeftRating,
        updated_at: new Date().toISOString(),
      })
      .eq("model_id", modelLeftId);
  } else {
    await supabase
      .from("model_stats")
      .insert({
        model_id: modelLeftId,
        ties: 1,
        total_battles: 1,
        rating: newLeftRating,
        wins: 0,
        losses: 0,
      });
  }
  
  // Update right model stats
  const { data: rightStats } = await supabase
    .from("model_stats")
    .select("ties, total_battles")
    .eq("model_id", modelRightId)
    .maybeSingle();
  
  if (rightStats) {
    await supabase
      .from("model_stats")
      .update({
        ties: rightStats.ties + 1,
        total_battles: rightStats.total_battles + 1,
        rating: newRightRating,
        updated_at: new Date().toISOString(),
      })
      .eq("model_id", modelRightId);
  } else {
    await supabase
      .from("model_stats")
      .insert({
        model_id: modelRightId,
        ties: 1,
        total_battles: 1,
        rating: newRightRating,
        wins: 0,
        losses: 0,
      });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { battleId, vote, sessionId }: VoteRequest = await req.json();

    if (!battleId || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing battleId or sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing vote for battle ${battleId}: ${vote || "tie"}`);

    // Fetch battle details with model info
    const { data: battle, error: battleError } = await supabase
      .from("battles")
      .select(`
        *,
        model_left:models!battles_model_left_id_fkey(id, name),
        model_right:models!battles_model_right_id_fkey(id, name)
      `)
      .eq("id", battleId)
      .single();

    if (battleError || !battle) {
      console.error("Error fetching battle:", battleError);
      return new Response(
        JSON.stringify({ error: "Battle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this session already voted on this battle
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("battle_id", battleId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingVote) {
      return new Response(
        JSON.stringify({ error: "You have already voted on this battle" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelLeft = battle.model_left;
    const modelRight = battle.model_right;

    // Get current stats for both models
    const { data: leftStats } = await supabase
      .from("model_stats")
      .select("rating")
      .eq("model_id", modelLeft.id)
      .maybeSingle();

    const { data: rightStats } = await supabase
      .from("model_stats")
      .select("rating")
      .eq("model_id", modelRight.id)
      .maybeSingle();

    const leftRating = leftStats?.rating || 1200;
    const rightRating = rightStats?.rating || 1200;

    // Record the vote - for ties, we need to handle differently since the enum only allows left/right
    // Ties are stored as a separate record or handled in stats directly
    if (vote) {
      const { error: voteError } = await supabase
        .from("votes")
        .insert({
          battle_id: battleId,
          selected_side: vote,
          session_id: sessionId,
        });

      if (voteError) {
        console.error("Error recording vote:", voteError);
        throw voteError;
      }
    } else {
      // Handle tie: update both models' stats without inserting a vote record (since enum doesn't support tie)
      // This allows ties to be tracked in model_stats while keeping votes table schema simple
      await updateTieStats(supabase, modelLeft.id, modelRight.id, leftRating, rightRating);
    }

    // Get updated ratings
    const { data: updatedLeftStats } = await supabase
      .from("model_stats")
      .select("rating")
      .eq("model_id", modelLeft.id)
      .maybeSingle();

    const { data: updatedRightStats } = await supabase
      .from("model_stats")
      .select("rating")
      .eq("model_id", modelRight.id)
      .maybeSingle();

    console.log(`Vote recorded: ${vote || "tie"} for battle ${battleId}`);
    console.log(`${modelLeft.name}: ${leftRating} -> ${updatedLeftStats?.rating || leftRating}`);
    console.log(`${modelRight.name}: ${rightRating} -> ${updatedRightStats?.rating || rightRating}`);

    return new Response(
      JSON.stringify({
        success: true,
        modelLeft: { 
          id: modelLeft.id, 
          name: modelLeft.name, 
          newRating: updatedLeftStats?.rating || leftRating 
        },
        modelRight: { 
          id: modelRight.id, 
          name: modelRight.name, 
          newRating: updatedRightStats?.rating || rightRating 
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Vote error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
