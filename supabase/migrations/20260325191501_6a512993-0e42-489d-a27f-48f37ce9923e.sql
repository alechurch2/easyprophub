
-- Add review_tier column to ai_chart_reviews (standard/premium)
ALTER TABLE public.ai_chart_reviews 
  ADD COLUMN IF NOT EXISTS review_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS ai_model_used text;

-- Create premium usage tracking table
CREATE TABLE public.premium_review_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_year text NOT NULL, -- format: '2026-03'
  reviews_used integer NOT NULL DEFAULT 0,
  quota_limit integer NOT NULL DEFAULT 3, -- default free quota
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.premium_review_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own premium usage" ON public.premium_review_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own premium usage" ON public.premium_review_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own premium usage" ON public.premium_review_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all premium usage" ON public.premium_review_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
