import { ThumbsUp, Equal, RotateCcw } from "lucide-react";

interface VotingPanelProps {
  onVote: (vote: "a" | "b" | "tie") => void;
  onNewBattle: () => void;
  isVoting: boolean;
  hasVoted: boolean;
}

export function VotingPanel({ onVote, onNewBattle, isVoting, hasVoted }: VotingPanelProps) {
  if (hasVoted) {
    return (
      <div className="animate-fade-in text-center">
        <p className="text-lg text-muted-foreground mb-4">
          Thanks for voting! The models have been revealed.
        </p>
        <button
          onClick={onNewBattle}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Start New Battle
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="text-center text-lg text-muted-foreground mb-6">
        Which response is better? Your vote helps train the leaderboard.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => onVote("a")}
          disabled={isVoting}
          className="vote-button vote-button-a w-full sm:w-auto group"
        >
          <ThumbsUp className="h-5 w-5 inline mr-2 group-hover:scale-110 transition-transform" />
          <span>Model A is Better</span>
        </button>

        <button
          onClick={() => onVote("tie")}
          disabled={isVoting}
          className="vote-button bg-secondary border-border text-foreground w-full sm:w-auto
                     hover:bg-tie/10 hover:border-tie/50 hover:text-tie"
        >
          <Equal className="h-5 w-5 inline mr-2" />
          <span>It's a Tie</span>
        </button>

        <button
          onClick={() => onVote("b")}
          disabled={isVoting}
          className="vote-button vote-button-b w-full sm:w-auto group"
        >
          <ThumbsUp className="h-5 w-5 inline mr-2 group-hover:scale-110 transition-transform" />
          <span>Model B is Better</span>
        </button>
      </div>

      {isVoting && (
        <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
          <span>Recording vote...</span>
        </div>
      )}
    </div>
  );
}
