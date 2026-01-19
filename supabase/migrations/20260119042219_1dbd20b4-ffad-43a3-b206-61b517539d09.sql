-- Create AI models registry table
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  description TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  battles_count INTEGER NOT NULL DEFAULT 0,
  wins_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create battles table to track each comparison
CREATE TABLE public.battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_a_id UUID NOT NULL REFERENCES public.ai_models(id),
  model_b_id UUID NOT NULL REFERENCES public.ai_models(id),
  prompt TEXT NOT NULL,
  response_a TEXT,
  response_b TEXT,
  winner_id UUID REFERENCES public.ai_models(id),
  is_tie BOOLEAN DEFAULT false,
  session_id TEXT NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- Public read access to models (leaderboard is public)
CREATE POLICY "Anyone can view models" 
ON public.ai_models 
FOR SELECT 
USING (true);

-- Public read access to battles (for analytics)
CREATE POLICY "Anyone can view battles" 
ON public.battles 
FOR SELECT 
USING (true);

-- Public insert for battles (anonymous voting)
CREATE POLICY "Anyone can create battles" 
ON public.battles 
FOR INSERT 
WITH CHECK (true);

-- Public update for battles (to record votes)
CREATE POLICY "Anyone can update battles" 
ON public.battles 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial AI models
INSERT INTO public.ai_models (name, provider, model_id, description) VALUES
  ('GPT-5', 'openai', 'openai/gpt-5', 'OpenAI''s flagship model with excellent reasoning and multimodal capabilities'),
  ('GPT-5 Mini', 'openai', 'openai/gpt-5-mini', 'Balanced performance with lower latency and cost'),
  ('GPT-5 Nano', 'openai', 'openai/gpt-5-nano', 'Fast and efficient for high-volume tasks'),
  ('Gemini 2.5 Pro', 'google', 'google/gemini-2.5-pro', 'Top-tier Gemini model for complex reasoning'),
  ('Gemini 2.5 Flash', 'google', 'google/gemini-2.5-flash', 'Balanced speed and quality'),
  ('Gemini 3 Flash Preview', 'google', 'google/gemini-3-flash-preview', 'Next-generation fast model'),
  ('Gemini 3 Pro Preview', 'google', 'google/gemini-3-pro-preview', 'Next-generation pro model');