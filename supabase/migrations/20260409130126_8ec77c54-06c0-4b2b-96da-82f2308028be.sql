
CREATE TABLE public.delta_zero_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  asset text NOT NULL,
  timeframe text NOT NULL,
  screenshot_url text,
  bias text NOT NULL DEFAULT 'no_trade',
  confidence integer NOT NULL DEFAULT 1,
  reasoning text,
  warning text,
  ai_model_used text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delta_zero_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own analyses" ON public.delta_zero_analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analyses" ON public.delta_zero_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analyses" ON public.delta_zero_analyses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
