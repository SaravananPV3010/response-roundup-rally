import { useEffect, useCallback } from "react";
import { ThumbsUp, Equal, RotateCcw, Keyboard, AlertTriangle } from "lucide-react";

interface VotingPanelProps {
  onVote: (vote: "a" | "b" | "tie") => void;
  onNewBattle: () => void;
  isVoting: boolean;
  hasVoted: boolean;
}

export function VotingPanel({ onVote, onNewBattle, isVoting, hasVoted }: VotingPanelProps) {
  // Keyboard shortcuts for faster voting
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (hasVoted || isVoting) return;
    
    switch (e.key.toLowerCase()) {
      case "1":
      case "a":
        onVote("a");
        break;
      case "2":
      case "b":
        onVote("b");
        break;
      case "t":
      case "=":
        onVote("tie");
        break;
    }
  }, [hasVoted, isVoting, onVote]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (hasVoted) {
    return (
      <div className="animate-fade-in text-center">
        <p className="text-lg text-muted-foreground mb-4">
          Vote recorded! Models revealed above.
        </p>
        <button
          onClick={onNewBattle}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          New Battle
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Irreversibility notice */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/80">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Your vote is final and cannot be changed</span>
      </div>

      <p className="text-center text-lg text-muted-foreground">
        Which response is better?
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => onVote("a")}
          disabled={isVoting}
          className="vote-button vote-button-a w-full sm:w-auto group"
        >
          <ThumbsUp className="h-5 w-5 inline mr-2 group-hover:scale-110 transition-transform" />
          <span>A is Better</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-black/20 hidden sm:inline">1</kbd>
        </button>

        <button
          onClick={() => onVote("tie")}
          disabled={isVoting}
          className="vote-button bg-secondary border-border text-foreground w-full sm:w-auto
                     hover:bg-tie/10 hover:border-tie/50 hover:text-tie"
        >
          <Equal className="h-5 w-5 inline mr-2" />
          <span>Tie</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-black/20 hidden sm:inline">T</kbd>
        </button>

        <button
          onClick={() => onVote("b")}
          disabled={isVoting}
          className="vote-button vote-button-b w-full sm:w-auto group"
        >
          <ThumbsUp className="h-5 w-5 inline mr-2 group-hover:scale-110 transition-transform" />
          <span>B is Better</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-black/20 hidden sm:inline">2</kbd>
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <Keyboard className="h-3 w-3" />
        <span>Press 1/A, T, or 2/B to vote quickly</span>
      </div>

      {isVoting && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
          <span>Recording...</span>
        </div>
      )}
    </div>
  );
}
