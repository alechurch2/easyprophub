
-- 1. QUOTA BYPASS FIX: Remove user UPDATE policies from usage tables
DROP POLICY IF EXISTS "Users can update own premium usage" ON public.premium_review_usage;
DROP POLICY IF EXISTS "Users can update own standard usage" ON public.standard_review_usage;

-- Create server-side RPC for incrementing usage (cannot be used to decrement)
CREATE OR REPLACE FUNCTION public.increment_review_usage(
  _user_id uuid,
  _month_year text,
  _tier text DEFAULT 'standard',
  _premium_quota_limit integer DEFAULT 3
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF _tier = 'standard' THEN
    INSERT INTO public.standard_review_usage (user_id, month_year, reviews_used)
    VALUES (_user_id, _month_year, 1)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET reviews_used = standard_review_usage.reviews_used + 1,
                  updated_at = now();
  ELSIF _tier = 'premium' THEN
    INSERT INTO public.premium_review_usage (user_id, month_year, reviews_used, quota_limit)
    VALUES (_user_id, _month_year, 1, _premium_quota_limit)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET reviews_used = premium_review_usage.reviews_used + 1,
                  updated_at = now();
  END IF;
END;
$$;

-- 2. REALTIME FIX: Remove trading_accounts from Realtime publication (contains investor_password)
ALTER PUBLICATION supabase_realtime DROP TABLE public.trading_accounts;

-- 3. STORAGE FIX: Scope chat-attachments SELECT to owner folder only
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view own chat attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. STORAGE FIX: Add DELETE policy for chart-screenshots
CREATE POLICY "Users can delete own chart screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chart-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
