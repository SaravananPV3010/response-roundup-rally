import { Bot, CheckCircle2, XCircle } from "lucide-react";

interface ResponseCardProps {
  label: "A" | "B";
  response: string;
  isLoading?: boolean;
  isWinner?: boolean;
  isLoser?: boolean;
  isTie?: boolean;
  modelName?: string;
  revealed?: boolean;
}

export function ResponseCard({
  label,
  response,
  isLoading,
  isWinner,
  isLoser,
  isTie,
  modelName,
  revealed,
}: ResponseCardProps) {
  const labelColor = label === "A" ? "text-model-a" : "text-model-b";
  const borderColor = isWinner
    ? "border-green-500/50"
    : isLoser
    ? "border-red-500/30"
    : isTie
    ? "border-tie/50"
    : "border-border/50";

  const glowClass = isWinner ? "shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]" : "";

  return (
    <div
      className={`response-card ${borderColor} ${glowClass} h-full flex flex-col ${
        label === "A" ? "animate-slide-in-left" : "animate-slide-in-right"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full 
                        ${label === "A" ? "bg-model-a/10" : "bg-model-b/10"}`}
          >
            <Bot className={`h-5 w-5 ${labelColor}`} />
          </div>
          <div>
            <span className={`font-bold text-lg ${labelColor}`}>Model {label}</span>
            {revealed && modelName && (
              <p className="text-sm font-mono text-muted-foreground animate-fade-in">
                {modelName}
              </p>
            )}
          </div>
        </div>

        {(isWinner || isLoser || isTie) && (
          <div className="animate-scale-in">
            {isWinner && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/30">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Winner</span>
              </div>
            )}
            {isLoser && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500/70 border border-red-500/20">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Loser</span>
              </div>
            )}
            {isTie && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tie/10 text-tie border border-tie/30">
                <span className="text-sm font-semibold">Tie</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-5 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="text-sm">Generating response...</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-secondary/50 rounded animate-pulse w-full" />
              <div className="h-4 bg-secondary/50 rounded animate-pulse w-4/5" />
              <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/5" />
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {response}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
