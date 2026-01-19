import { Header } from "@/components/Header";
import { Leaderboard } from "@/components/Leaderboard";
import { Stats } from "@/components/Stats";

const LeaderboardPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="gradient-text glow-text">AI Model Leaderboard</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Rankings powered by community votes using ELO rating system
            </p>
          </div>

          <Stats />
          
          <Leaderboard />
        </div>
      </main>

      <footer className="border-t border-border/30 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>AI Arena — Anonymous AI Model Comparison Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default LeaderboardPage;
