import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Elo configuration - centralized for easy algorithm upgrades
const ELO_CONFIG = {
  K_FACTOR: 32,           // How much ratings change per match
  INITIAL_RATING: 1200,   // Starting rating for new models
  WIN_SCORE: 1.0,         // Score for a win
  LOSS_SCORE: 0.0,        // Score for a loss
  TIE_SCORE: 0.5,         // Score for a tie
};

// Calculate expected score using Elo formula
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
}

// Calculate new Elo rating
function calculateNewRating(
  currentRating: number,
  expectedScore: number,
  actualScore: number,
  kFactor: number = ELO_CONFIG.K_FACTOR
): number {
  return Math.round(currentRating + kFactor * (actualScore - expectedScore));
}

interface ModelRating {
  rating: number;
  wins: number;
  losses: number;
  ties: number;
  totalBattles: number;
}

interface VoteRecord {
  battle_id: string;
  selected_side: "left" | "right";
  created_at: string;
  battles: {
    model_left_id: string;
    model_right_id: string;
  };
}

/**
 * Recalculates all model ratings from scratch based on stored vote data.
 * This allows for algorithm upgrades without losing historical data.
 * 
 * Algorithm can be swapped by modifying:
 * - ELO_CONFIG for parameter tuning
 * - calculateExpectedScore for different probability models
 * - calculateNewRating for different update formulas
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting rating recalculation...");

    // Fetch all models
    const { data: models, error: modelsError } = await supabase
      .from("models")
      .select("id, name")
      .eq("status", "active");

    if (modelsError) throw modelsError;

    // Initialize ratings for all models
    const modelRatings: Record<string, ModelRating> = {};
    for (const model of models || []) {
      modelRatings[model.id] = {
        rating: ELO_CONFIG.INITIAL_RATING,
        wins: 0,
        losses: 0,
        ties: 0,
        totalBattles: 0,
      };
    }

    // Fetch all votes with battle info, ordered by creation time
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select(`
        battle_id,
        selected_side,
        created_at,
        battles!inner (
          model_left_id,
          model_right_id
        )
      `)
      .order("created_at", { ascending: true });

    if (votesError) throw votesError;

    console.log(`Processing ${votes?.length || 0} votes...`);

    // Process each vote chronologically
    for (const vote of (votes as unknown as VoteRecord[]) || []) {
      const modelLeftId = vote.battles.model_left_id;
      const modelRightId = vote.battles.model_right_id;

      // Ensure both models exist in our tracking
      if (!modelRatings[modelLeftId]) {
        modelRatings[modelLeftId] = {
          rating: ELO_CONFIG.INITIAL_RATING,
          wins: 0,
          losses: 0,
          ties: 0,
          totalBattles: 0,
        };
      }
      if (!modelRatings[modelRightId]) {
        modelRatings[modelRightId] = {
          rating: ELO_CONFIG.INITIAL_RATING,
          wins: 0,
          losses: 0,
          ties: 0,
          totalBattles: 0,
        };
      }

      const leftRating = modelRatings[modelLeftId].rating;
      const rightRating = modelRatings[modelRightId].rating;

      const expectedLeft = calculateExpectedScore(leftRating, rightRating);
      const expectedRight = calculateExpectedScore(rightRating, leftRating);

      let leftScore: number;
      let rightScore: number;

      if (vote.selected_side === "left") {
        leftScore = ELO_CONFIG.WIN_SCORE;
        rightScore = ELO_CONFIG.LOSS_SCORE;
        modelRatings[modelLeftId].wins++;
        modelRatings[modelRightId].losses++;
      } else {
        leftScore = ELO_CONFIG.LOSS_SCORE;
        rightScore = ELO_CONFIG.WIN_SCORE;
        modelRatings[modelLeftId].losses++;
        modelRatings[modelRightId].wins++;
      }

      modelRatings[modelLeftId].rating = calculateNewRating(leftRating, expectedLeft, leftScore);
      modelRatings[modelRightId].rating = calculateNewRating(rightRating, expectedRight, rightScore);
      modelRatings[modelLeftId].totalBattles++;
      modelRatings[modelRightId].totalBattles++;
    }

    // Note: Ties are tracked in model_stats but not in votes table (due to enum constraint)
    // A future migration could add "tie" to the vote_side enum for complete recalculation

    // Update all model stats in database
    const updates = Object.entries(modelRatings).map(([modelId, stats]) => ({
      model_id: modelId,
      rating: stats.rating,
      wins: stats.wins,
      losses: stats.losses,
      ties: stats.ties, // Will be 0 from recalc - ties aren't in votes table
      total_battles: stats.totalBattles,
      updated_at: new Date().toISOString(),
    }));

    console.log(`Updating ${updates.length} model stats...`);

    // Upsert all stats
    for (const update of updates) {
      const { error } = await supabase
        .from("model_stats")
        .upsert(update, { onConflict: "model_id" });
      
      if (error) {
        console.error(`Error updating model ${update.model_id}:`, error);
      }
    }

    console.log("Rating recalculation complete!");

    return new Response(
      JSON.stringify({
        success: true,
        modelsUpdated: updates.length,
        votesProcessed: votes?.length || 0,
        ratings: updates.map((u) => ({
          modelId: u.model_id,
          rating: u.rating,
          wins: u.wins,
          losses: u.losses,
          totalBattles: u.total_battles,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recalculation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
