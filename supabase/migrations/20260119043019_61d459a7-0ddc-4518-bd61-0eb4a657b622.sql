-- Drop existing tables (they have minimal data and we're restructuring)
DROP TABLE IF EXISTS public.battles CASCADE;
DROP TABLE IF EXISTS public.ai_models CASCADE;

-- Create enums for type safety
CREATE TYPE public.model_provider AS ENUM ('openai', 'anthropic', 'gemini', 'local');
CREATE TYPE public.model_status AS ENUM ('active', 'disabled');
CREATE TYPE public.vote_side AS ENUM ('left', 'right');

-- 1. Models table
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider model_provider NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status model_status NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT models_name_provider_version_unique UNIQUE (name, provider, version)
);

-- Index for filtering active models
CREATE INDEX idx_models_status ON public.models(status);
CREATE INDEX idx_models_provider ON public.models(provider);

-- 2. Battles table
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  model_left_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  model_right_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  response_left TEXT,
  response_right TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT battles_different_models CHECK (model_left_id != model_right_id)
);

-- Indexes for battle queries
CREATE INDEX idx_battles_model_left ON public.battles(model_left_id);
CREATE INDEX idx_battles_model_right ON public.battles(model_right_id);
CREATE INDEX idx_battles_session ON public.battles(session_id);
CREATE INDEX idx_battles_created_at ON public.battles(created_at DESC);

-- 3. Votes table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  selected_side vote_side NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT votes_one_per_session_per_battle UNIQUE (battle_id, session_id)
);

-- Index for vote lookups
CREATE INDEX idx_votes_battle ON public.votes(battle_id);
CREATE INDEX idx_votes_session ON public.votes(session_id);

-- 4. Model Stats table (denormalized for performance)
CREATE TABLE public.model_stats (
  model_id UUID PRIMARY KEY REFERENCES public.models(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  total_battles INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 1200,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stats_non_negative CHECK (wins >= 0 AND losses >= 0 AND ties >= 0 AND total_battles >= 0),
  CONSTRAINT stats_battles_sum CHECK (total_battles = wins + losses + ties)
);

-- Index for leaderboard queries
CREATE INDEX idx_model_stats_rating ON public.model_stats(rating DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_model_stats_updated_at
  BEFORE UPDATE ON public.model_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update model stats when a vote is cast
CREATE OR REPLACE FUNCTION public.update_model_stats_on_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_battle RECORD;
  v_winner_id UUID;
  v_loser_id UUID;
  k_factor INTEGER := 32;
  v_expected_winner FLOAT;
  v_expected_loser FLOAT;
  v_winner_rating INTEGER;
  v_loser_rating INTEGER;
BEGIN
  -- Get battle details
  SELECT * INTO v_battle FROM public.battles WHERE id = NEW.battle_id;
  
  -- Determine winner and loser
  IF NEW.selected_side = 'left' THEN
    v_winner_id := v_battle.model_left_id;
    v_loser_id := v_battle.model_right_id;
  ELSE
    v_winner_id := v_battle.model_right_id;
    v_loser_id := v_battle.model_left_id;
  END IF;
  
  -- Get current ratings
  SELECT rating INTO v_winner_rating FROM public.model_stats WHERE model_id = v_winner_id;
  SELECT rating INTO v_loser_rating FROM public.model_stats WHERE model_id = v_loser_id;
  
  -- Handle case where stats don't exist yet
  IF v_winner_rating IS NULL THEN
    v_winner_rating := 1200;
  END IF;
  IF v_loser_rating IS NULL THEN
    v_loser_rating := 1200;
  END IF;
  
  -- Calculate expected scores (Elo formula)
  v_expected_winner := 1.0 / (1.0 + POWER(10.0, (v_loser_rating - v_winner_rating) / 400.0));
  v_expected_loser := 1.0 / (1.0 + POWER(10.0, (v_winner_rating - v_loser_rating) / 400.0));
  
  -- Update winner stats
  INSERT INTO public.model_stats (model_id, wins, losses, ties, total_battles, rating)
  VALUES (v_winner_id, 1, 0, 0, 1, 1200 + ROUND(k_factor * (1 - v_expected_winner))::INTEGER)
  ON CONFLICT (model_id) DO UPDATE SET
    wins = model_stats.wins + 1,
    total_battles = model_stats.total_battles + 1,
    rating = model_stats.rating + ROUND(k_factor * (1 - v_expected_winner))::INTEGER,
    updated_at = now();
  
  -- Update loser stats
  INSERT INTO public.model_stats (model_id, wins, losses, ties, total_battles, rating)
  VALUES (v_loser_id, 0, 1, 0, 1, 1200 + ROUND(k_factor * (0 - v_expected_loser))::INTEGER)
  ON CONFLICT (model_id) DO UPDATE SET
    losses = model_stats.losses + 1,
    total_battles = model_stats.total_battles + 1,
    rating = model_stats.rating + ROUND(k_factor * (0 - v_expected_loser))::INTEGER,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger to update stats on vote
CREATE TRIGGER on_vote_update_stats
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_model_stats_on_vote();

-- Enable RLS on all tables
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for models (public read, no public write)
CREATE POLICY "Anyone can view models"
  ON public.models FOR SELECT
  USING (true);

-- RLS Policies for battles
CREATE POLICY "Anyone can view battles"
  ON public.battles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create battles"
  ON public.battles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update battles"
  ON public.battles FOR UPDATE
  USING (true);

-- RLS Policies for votes
CREATE POLICY "Anyone can view votes"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create votes"
  ON public.votes FOR INSERT
  WITH CHECK (true);

-- RLS Policies for model_stats
CREATE POLICY "Anyone can view model stats"
  ON public.model_stats FOR SELECT
  USING (true);