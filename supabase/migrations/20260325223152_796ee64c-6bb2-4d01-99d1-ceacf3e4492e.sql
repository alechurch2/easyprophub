
-- AI usage tracking log
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_type text NOT NULL, -- 'chat', 'chart_review_standard', 'chart_review_premium'
  model text NOT NULL,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  estimated_cost numeric(10,6) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage logs" ON public.ai_usage_log
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert usage logs" ON public.ai_usage_log
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_log_function_type ON public.ai_usage_log(function_type);

-- AI usage limits (global + per-user overrides)
CREATE TABLE public.ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL = global default
  limit_type text NOT NULL, -- 'chat_daily', 'chart_review_standard_daily', 'chart_review_standard_monthly', 'chart_review_premium_monthly'
  limit_value integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, limit_type)
);

ALTER TABLE public.ai_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage usage limits" ON public.ai_usage_limits
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Insert default global limits
INSERT INTO public.ai_usage_limits (user_id, limit_type, limit_value) VALUES
  (NULL, 'chat_daily', 50),
  (NULL, 'chart_review_standard_daily', 20),
  (NULL, 'chart_review_standard_monthly', 200),
  (NULL, 'chart_review_premium_monthly', 3);
