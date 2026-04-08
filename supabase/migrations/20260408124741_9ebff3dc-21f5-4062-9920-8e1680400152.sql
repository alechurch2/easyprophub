CREATE TABLE public.user_risk_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  risk_reference_type text NOT NULL DEFAULT 'manual_account_size',
  manual_account_size numeric DEFAULT 100000,
  linked_account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  default_risk_percent numeric NOT NULL DEFAULT 0.002,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_risk_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk preferences"
ON public.user_risk_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk preferences"
ON public.user_risk_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk preferences"
ON public.user_risk_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all risk preferences"
ON public.user_risk_preferences FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));