
-- Add sync-related columns to trading_accounts
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS last_successful_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS investor_password text;

-- Create account_sync_logs table
CREATE TABLE IF NOT EXISTS public.account_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  trades_synced integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.account_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs" ON public.account_sync_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sync logs" ON public.account_sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sync logs" ON public.account_sync_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Add external_trade_id to account_trade_history for deduplication
ALTER TABLE public.account_trade_history
  ADD COLUMN IF NOT EXISTS external_trade_id text;

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_external_trade
  ON public.account_trade_history (account_id, external_trade_id)
  WHERE external_trade_id IS NOT NULL;
