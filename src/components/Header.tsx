import { Link, useLocation } from "react-router-dom";
import { Swords, Trophy, Shield, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const location = useLocation();
  const { user, isAdmin, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-border/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Swords className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-lg bg-primary/30 -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">AI Arena</h1>
              <p className="text-xs text-muted-foreground">Battle of the Models</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                location.pathname === "/"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Swords className="h-4 w-4" />
              <span className="hidden sm:inline">Arena</span>
            </Link>
            <Link
              to="/leaderboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                location.pathname === "/leaderboard"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>
            
            {!isLoading && (
              isAdmin ? (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    location.pathname === "/admin"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              ) : !user && (
                <Link
                  to="/login"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    location.pathname === "/login"
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
