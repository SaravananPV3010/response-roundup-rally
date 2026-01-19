import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLE_PROMPTS = [
  "Explain quantum computing in simple terms",
  "Write a haiku about artificial intelligence",
  "What's the best way to learn programming?",
  "Compare functional and object-oriented programming",
  "Explain the concept of recursion with an example",
];

export function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          <span className="gradient-text glow-text">Which AI thinks better?</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Enter a prompt and vote for the best response. Models are revealed after voting.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything... Compare explanations, writing styles, or problem-solving approaches"
            className="input-arena min-h-[120px] resize-none pr-14"
            disabled={isLoading}
            rows={3}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="absolute right-3 bottom-3 btn-primary !p-3 !rounded-lg"
            aria-label="Start battle"
          >
            {isLoading ? (
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Try an example:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-sm bg-secondary/50 text-muted-foreground 
                         hover:bg-secondary hover:text-foreground transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         border border-border/50 hover:border-border"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
