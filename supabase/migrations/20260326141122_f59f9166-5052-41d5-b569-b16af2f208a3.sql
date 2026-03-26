
-- Fix search_path for the two new functions
CREATE OR REPLACE FUNCTION public.check_account_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'current_count', (SELECT count(*) FROM public.trading_accounts WHERE user_id = _user_id),
    'max_allowed', COALESCE(
      (SELECT max_accounts FROM public.user_account_limits WHERE user_id = _user_id),
      1
    ),
    'can_connect', (SELECT count(*) FROM public.trading_accounts WHERE user_id = _user_id) < COALESCE(
      (SELECT max_accounts FROM public.user_account_limits WHERE user_id = _user_id),
      1
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_broker_allowed(_user_id uuid, _broker_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supported_brokers WHERE LOWER(name) = LOWER(_broker_name) AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.user_broker_overrides WHERE user_id = _user_id AND LOWER(broker_name) = LOWER(_broker_name)
  )
$$;
