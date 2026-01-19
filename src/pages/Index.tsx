import { Header } from "@/components/Header";
import { BattleArena } from "@/components/BattleArena";
import { Stats } from "@/components/Stats";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="mb-8">
          <Stats />
        </div>
        
        <div className="flex-1 flex items-start justify-center">
          <BattleArena />
        </div>
      </main>

      <footer className="border-t border-border/30 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>AI Arena — Anonymous AI Model Comparison Platform</p>
          <p className="mt-1">Vote for the best responses and help build community rankings</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
