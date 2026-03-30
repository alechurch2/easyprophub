
-- Add source linking columns to account_trade_history
ALTER TABLE public.account_trade_history
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_review_id uuid REFERENCES public.ai_chart_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_signal_id uuid REFERENCES public.shared_signals(id) ON DELETE SET NULL;

-- Create trade AI reviews table
CREATE TABLE public.trade_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.account_trade_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_review_id uuid REFERENCES public.ai_chart_reviews(id) ON DELETE SET NULL,
  source_signal_id uuid REFERENCES public.shared_signals(id) ON DELETE SET NULL,
  analysis jsonb,
  status text NOT NULL DEFAULT 'pending',
  ai_model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_ai_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trade reviews" ON public.trade_ai_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade reviews" ON public.trade_ai_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade reviews" ON public.trade_ai_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trade reviews" ON public.trade_ai_reviews
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Allow users to update their own trades (for linking)
-- Already exists from RLS but let's make sure source columns are updatable
-- The existing "Users can update own accounts" policy on account_trade_history
-- doesn't exist, so we add one for updating source fields
CREATE POLICY "Users can update own trades" ON public.account_trade_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
