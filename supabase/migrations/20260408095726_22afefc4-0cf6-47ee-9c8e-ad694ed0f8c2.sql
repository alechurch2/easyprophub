
-- Remove client INSERT policies from quota tables (quota writes must go through server-side RPC only)
DROP POLICY IF EXISTS "Users can insert own standard usage" ON public.standard_review_usage;
DROP POLICY IF EXISTS "Users can insert own premium usage" ON public.premium_review_usage;

-- Add CHECK constraints to prevent negative values
ALTER TABLE public.standard_review_usage ADD CONSTRAINT standard_reviews_used_non_negative CHECK (reviews_used >= 0);
ALTER TABLE public.premium_review_usage ADD CONSTRAINT premium_reviews_used_non_negative CHECK (reviews_used >= 0);
