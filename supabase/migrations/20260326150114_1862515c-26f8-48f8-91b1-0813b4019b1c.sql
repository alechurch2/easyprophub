
-- Add trading capability columns to trading_accounts
ALTER TABLE public.trading_accounts 
  ADD COLUMN IF NOT EXISTS credential_mode text NOT NULL DEFAULT 'investor',
  ADD COLUMN IF NOT EXISTS trading_execution_enabled boolean NOT NULL DEFAULT false;

-- Create order execution logs table
CREATE TABLE public.order_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  review_id uuid REFERENCES public.ai_chart_reviews(id) ON DELETE SET NULL,
  asset text NOT NULL,
  direction text NOT NULL,
  order_type text NOT NULL DEFAULT 'market',
  lot_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  stop_loss numeric,
  take_profit numeric,
  status text NOT NULL DEFAULT 'pending',
  provider_response jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own execution logs" ON public.order_execution_logs
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Users can create own execution logs" ON public.order_execution_logs
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all execution logs" ON public.order_execution_logs
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update execution logs" ON public.order_execution_logs
  FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
