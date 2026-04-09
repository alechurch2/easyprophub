-- Add scope column to trading_accounts to isolate Delta-Zero accounts
ALTER TABLE public.trading_accounts
ADD COLUMN scope text NOT NULL DEFAULT 'standard';

-- Create Delta-Zero account settings
CREATE TABLE public.delta_zero_account_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  role text NOT NULL,
  default_risk_percent numeric NOT NULL DEFAULT 0.5,
  default_sl_pips numeric NOT NULL DEFAULT 20,
  default_tp_pips numeric NOT NULL DEFAULT 40,
  default_lot_size numeric NOT NULL DEFAULT 0.01,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Validation trigger for role values
CREATE OR REPLACE FUNCTION public.validate_dz_account_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role NOT IN ('broker', 'hedge') THEN
    RAISE EXCEPTION 'role must be broker or hedge';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_dz_role
BEFORE INSERT OR UPDATE ON public.delta_zero_account_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_dz_account_role();

-- Timestamp trigger
CREATE TRIGGER update_dz_settings_updated_at
BEFORE UPDATE ON public.delta_zero_account_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delta_zero_account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dz settings"
ON public.delta_zero_account_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dz settings"
ON public.delta_zero_account_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dz settings"
ON public.delta_zero_account_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dz settings"
ON public.delta_zero_account_settings FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dz settings"
ON public.delta_zero_account_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update check_account_limit to only count standard accounts
CREATE OR REPLACE FUNCTION public.check_account_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'current_count', (SELECT count(*) FROM public.trading_accounts WHERE user_id = _user_id AND scope = 'standard'),
    'max_allowed', COALESCE(
      (SELECT max_accounts FROM public.user_account_limits WHERE user_id = _user_id),
      1
    ),
    'can_connect', (SELECT count(*) FROM public.trading_accounts WHERE user_id = _user_id AND scope = 'standard') < COALESCE(
      (SELECT max_accounts FROM public.user_account_limits WHERE user_id = _user_id),
      1
    )
  )
$$;