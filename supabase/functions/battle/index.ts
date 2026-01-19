import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateWithMessages, ProviderError } from "../_shared/ai/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BattleRequest {
  prompt: string;
  sessionId: string;
}

interface Model {
  id: string;
  name: string;
  metadata: { model_id?: string } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { prompt, sessionId }: BattleRequest = await req.json();

    if (!prompt || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing prompt or sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting battle for prompt: "${prompt.substring(0, 50)}..."`);

    // Fetch active models
    const { data: models, error: modelsError } = await supabase
      .from("models")
      .select("id, name, metadata")
      .eq("status", "active");

    if (modelsError || !models || models.length < 2) {
      console.error("Error fetching models:", modelsError);
      return new Response(
        JSON.stringify({ error: "Not enough active models available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Randomly select two different models
    const shuffled = [...models].sort(() => Math.random() - 0.5);
    const modelLeft: Model = shuffled[0];
    const modelRight: Model = shuffled[1];

    console.log(`Selected models: ${modelLeft.name} vs ${modelRight.name}`);

    // Create battle record
    const { data: battle, error: battleError } = await supabase
      .from("battles")
      .insert({
        model_left_id: modelLeft.id,
        model_right_id: modelRight.id,
        prompt,
        session_id: sessionId,
      })
      .select()
      .single();

    if (battleError) {
      console.error("Error creating battle:", battleError);
      return new Response(
        JSON.stringify({ error: "Failed to create battle" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = "You are a helpful AI assistant. Provide clear, accurate, and well-structured responses. Be concise but thorough.";

    // Generate responses using the abstraction layer
    const generateForModel = async (model: Model): Promise<string> => {
      const modelId = model.metadata?.model_id || "google/gemini-3-flash-preview";
      console.log(`Generating response for ${model.name} (${modelId})`);

      try {
        const result = await generateWithMessages({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          model: modelId,
          maxTokens: 1024,
          temperature: 0.7,
          timeoutMs: 45000,
        });

        console.log(`${model.name} responded in ${result.latencyMs}ms`);
        return result.content;
      } catch (error) {
        const providerError = error as ProviderError;
        console.error(`${model.name} error:`, providerError.message);
        
        if (providerError.code === "RATE_LIMIT") {
          throw new Error("Rate limit exceeded");
        }
        
        return `[Error generating response: ${providerError.message}]`;
      }
    };

    const [responseLeft, responseRight] = await Promise.all([
      generateForModel(modelLeft),
      generateForModel(modelRight),
    ]);

    // Update battle with responses
    const { error: updateError } = await supabase
      .from("battles")
      .update({
        response_left: responseLeft,
        response_right: responseRight,
      })
      .eq("id", battle.id);

    if (updateError) {
      console.error("Error updating battle responses:", updateError);
    }

    console.log(`Battle ${battle.id} completed successfully`);

    return new Response(
      JSON.stringify({
        battleId: battle.id,
        responseLeft,
        responseRight,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Battle error:", error);

    if (error instanceof Error && error.message.includes("Rate limit")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
