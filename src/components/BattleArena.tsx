import { useState } from "react";
import { ResponseCard } from "./ResponseCard";
import { VotingPanel } from "./VotingPanel";
import { PromptInput } from "./PromptInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BattleState {
  battleId: string;
  prompt: string;
  responseLeft: string;
  responseRight: string;
  vote: "left" | "right" | "tie" | null;
  modelLeftName?: string;
  modelRightName?: string;
}

export function BattleArena() {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  const getSessionId = () => {
    let sessionId = localStorage.getItem("arena_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("arena_session_id", sessionId);
    }
    return sessionId;
  };

  const startBattle = async (prompt: string) => {
    setIsLoading(true);
    setBattleState({
      battleId: "",
      prompt,
      responseLeft: "",
      responseRight: "",
      vote: null,
    });

    try {
      const { data, error } = await supabase.functions.invoke("battle", {
        body: { prompt, sessionId: getSessionId() },
      });

      if (error) throw error;

      setBattleState({
        battleId: data.battleId,
        prompt,
        responseLeft: data.responseLeft,
        responseRight: data.responseRight,
        vote: null,
      });
    } catch (error) {
      console.error("Battle error:", error);
      toast({
        title: "Battle Failed",
        description: error instanceof Error ? error.message : "Failed to start battle. Please try again.",
        variant: "destructive",
      });
      setBattleState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const submitVote = async (vote: "left" | "right" | "tie") => {
    if (!battleState?.battleId) return;

    setIsVoting(true);

    try {
      const { data, error } = await supabase.functions.invoke("vote", {
        body: { 
          battleId: battleState.battleId, 
          vote: vote === "tie" ? null : vote,
          sessionId: getSessionId(),
        },
      });

      if (error) throw error;

      setBattleState((prev) =>
        prev
          ? {
              ...prev,
              vote,
              modelLeftName: data.modelLeft.name,
              modelRightName: data.modelRight.name,
            }
          : null
      );

      toast({
        title: "Vote Recorded!",
        description: `${data.modelLeft.name} (${data.modelLeft.newRating}) vs ${data.modelRight.name} (${data.modelRight.newRating})`,
      });
    } catch (error) {
      console.error("Vote error:", error);
      toast({
        title: "Vote Failed",
        description: "Failed to record vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const resetBattle = () => {
    setBattleState(null);
  };

  // Show prompt input if no battle is active
  if (!battleState) {
    return <PromptInput onSubmit={startBattle} isLoading={isLoading} />;
  }

  const hasVoted = battleState.vote !== null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Prompt Display */}
      <div className="glass-panel p-4 animate-fade-in">
        <p className="text-sm text-muted-foreground mb-1">Your prompt:</p>
        <p className="text-foreground font-medium">{battleState.prompt}</p>
      </div>

      {/* Response Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <ResponseCard
          label="A"
          response={battleState.responseLeft}
          isLoading={isLoading}
          isWinner={hasVoted && battleState.vote === "left"}
          isLoser={hasVoted && battleState.vote === "right"}
          isTie={hasVoted && battleState.vote === "tie"}
          modelName={battleState.modelLeftName}
          revealed={hasVoted}
        />
        <ResponseCard
          label="B"
          response={battleState.responseRight}
          isLoading={isLoading}
          isWinner={hasVoted && battleState.vote === "right"}
          isLoser={hasVoted && battleState.vote === "left"}
          isTie={hasVoted && battleState.vote === "tie"}
          modelName={battleState.modelRightName}
          revealed={hasVoted}
        />
      </div>

      {/* Voting Panel */}
      {!isLoading && battleState.responseLeft && battleState.responseRight && (
        <VotingPanel
          onVote={(v) => submitVote(v === "a" ? "left" : v === "b" ? "right" : "tie")}
          onNewBattle={resetBattle}
          isVoting={isVoting}
          hasVoted={hasVoted}
        />
      )}
    </div>
  );
}
