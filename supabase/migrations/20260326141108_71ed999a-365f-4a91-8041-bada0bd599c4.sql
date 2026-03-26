
-- 1. Supported brokers table
CREATE TABLE public.supported_brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  platforms text[] NOT NULL DEFAULT '{MT5}',
  servers text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active brokers"
  ON public.supported_brokers FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage brokers"
  ON public.supported_brokers FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'));

-- Seed supported brokers
INSERT INTO public.supported_brokers (name, platforms, servers) VALUES
  ('TMGM', '{MT4,MT5}', '{}'),
  ('FundedElite', '{MT4,MT5}', '{}');

-- 2. Account connection requests (extra account requests)
CREATE TABLE public.account_connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broker text NOT NULL,
  platform text NOT NULL DEFAULT 'MT5',
  server text,
  account_type text DEFAULT 'live',
  note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.account_connection_requests FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests"
  ON public.account_connection_requests FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.account_connection_requests FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
  ON public.account_connection_requests FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'));

-- 3. Broker support requests (new broker requests)
CREATE TABLE public.broker_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broker_name text NOT NULL,
  platform text NOT NULL DEFAULT 'MT5',
  server text,
  note text,
  reference_link text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  approved_broker_id uuid REFERENCES public.supported_brokers(id),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broker requests"
  ON public.broker_support_requests FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own broker requests"
  ON public.broker_support_requests FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all broker requests"
  ON public.broker_support_requests FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update broker requests"
  ON public.broker_support_requests FOR UPDATE TO public
  USING (has_role(auth.uid(), 'admin'));

-- 4. User-specific broker overrides (admin approves specific broker for specific user)
CREATE TABLE public.user_broker_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broker_name text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, broker_name)
);

ALTER TABLE public.user_broker_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own overrides"
  ON public.user_broker_overrides FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage overrides"
  ON public.user_broker_overrides FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'));

-- 5. User account limits override (default is 1, admin can increase)
CREATE TABLE public.user_account_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_accounts integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.user_account_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own limits"
  ON public.user_account_limits FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage limits"
  ON public.user_account_limits FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'));

-- 6. DB function to check account limit server-side
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

-- 7. DB function to check broker allowed server-side
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
