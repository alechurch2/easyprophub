
ALTER TABLE public.ai_chart_reviews
ADD COLUMN review_mode text NOT NULL DEFAULT 'pro',
ADD COLUMN account_size integer NULL,
ADD COLUMN custom_account_size numeric NULL;
