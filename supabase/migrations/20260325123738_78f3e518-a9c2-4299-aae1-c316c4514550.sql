
-- Add new columns to ai_chart_reviews
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS user_note text;
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS parent_review_id uuid REFERENCES public.ai_chart_reviews(id);
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS is_didactic_example boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS didactic_title text;
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS didactic_description text;
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS didactic_tags text[];
ALTER TABLE public.ai_chart_reviews ADD COLUMN IF NOT EXISTS didactic_visible boolean NOT NULL DEFAULT false;

-- Create ai_review_ratings table
CREATE TABLE public.ai_review_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.ai_chart_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_useful boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);

ALTER TABLE public.ai_review_ratings ENABLE ROW LEVEL SECURITY;

-- RLS: users can view own ratings
CREATE POLICY "Users can view own ratings"
ON public.ai_review_ratings FOR SELECT
USING (auth.uid() = user_id);

-- RLS: users can insert own ratings
CREATE POLICY "Users can insert own ratings"
ON public.ai_review_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS: users can update own ratings
CREATE POLICY "Users can update own ratings"
ON public.ai_review_ratings FOR UPDATE
USING (auth.uid() = user_id);

-- RLS: admins can view all ratings
CREATE POLICY "Admins can view all ratings"
ON public.ai_review_ratings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can update reviews for didactic fields
CREATE POLICY "Users can update own review notes"
ON public.ai_chart_reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
