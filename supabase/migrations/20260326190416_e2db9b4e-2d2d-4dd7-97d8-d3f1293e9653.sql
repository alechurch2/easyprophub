
-- Onboarding progress table
CREATE TABLE public.user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, step_key)
);

ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding" ON public.user_onboarding_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding" ON public.user_onboarding_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding" ON public.user_onboarding_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Product analytics events table
CREATE TABLE public.product_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  page text,
  section text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analytics" ON public.product_analytics_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert own events" ON public.product_analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_analytics_event_name ON public.product_analytics_events(event_name);
CREATE INDEX idx_analytics_user_id ON public.product_analytics_events(user_id);
CREATE INDEX idx_analytics_created_at ON public.product_analytics_events(created_at);
CREATE INDEX idx_onboarding_user_id ON public.user_onboarding_progress(user_id);
