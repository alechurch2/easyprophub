
-- Create license_level enum
CREATE TYPE public.license_level AS ENUM ('free', 'pro', 'live');

-- Create user_license_settings table
CREATE TABLE public.user_license_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  license_level public.license_level NOT NULL DEFAULT 'free',
  training_access_level text NOT NULL DEFAULT 'partial' CHECK (training_access_level IN ('partial', 'full')),
  ai_assistant_enabled boolean NOT NULL DEFAULT true,
  chart_review_monthly_limit integer NOT NULL DEFAULT 5,
  premium_review_monthly_limit integer NOT NULL DEFAULT 0,
  account_center_enabled boolean NOT NULL DEFAULT false,
  trade_execution_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.user_license_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own license settings"
  ON public.user_license_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all license settings"
  ON public.user_license_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert license settings"
  ON public.user_license_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update license settings"
  ON public.user_license_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create license settings for new users via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_license()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_license_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_license
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_license();

-- Add min_license_level to course tables
ALTER TABLE public.course_categories ADD COLUMN min_license_level public.license_level NOT NULL DEFAULT 'free';
ALTER TABLE public.course_modules ADD COLUMN min_license_level public.license_level NOT NULL DEFAULT 'free';
ALTER TABLE public.course_lessons ADD COLUMN min_license_level public.license_level NOT NULL DEFAULT 'free';

-- Helper function to get user license settings (for edge functions)
CREATE OR REPLACE FUNCTION public.get_user_license_settings(_user_id uuid)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'license_level', license_level::text,
      'training_access_level', training_access_level,
      'ai_assistant_enabled', ai_assistant_enabled,
      'chart_review_monthly_limit', chart_review_monthly_limit,
      'premium_review_monthly_limit', premium_review_monthly_limit,
      'account_center_enabled', account_center_enabled,
      'trade_execution_enabled', trade_execution_enabled
    )
    FROM public.user_license_settings
    WHERE user_id = _user_id),
    jsonb_build_object(
      'license_level', 'free',
      'training_access_level', 'partial',
      'ai_assistant_enabled', true,
      'chart_review_monthly_limit', 5,
      'premium_review_monthly_limit', 0,
      'account_center_enabled', false,
      'trade_execution_enabled', false
    )
  )
$$;

-- Create standard_review_usage table for tracking monthly standard reviews
CREATE TABLE public.standard_review_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  reviews_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.standard_review_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own standard usage"
  ON public.standard_review_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own standard usage"
  ON public.standard_review_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own standard usage"
  ON public.standard_review_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all standard usage"
  ON public.standard_review_usage FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage standard usage"
  ON public.standard_review_usage FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
