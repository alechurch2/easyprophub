
-- Trading Accounts table
CREATE TABLE public.trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_name text NOT NULL,
  platform text NOT NULL DEFAULT 'MT5',
  broker text,
  server text,
  account_number text,
  investor_password text,
  connection_status text NOT NULL DEFAULT 'pending',
  read_only_mode boolean NOT NULL DEFAULT true,
  balance numeric DEFAULT 0,
  equity numeric DEFAULT 0,
  profit_loss numeric DEFAULT 0,
  drawdown numeric DEFAULT 0,
  daily_pnl numeric DEFAULT 0,
  weekly_pnl numeric DEFAULT 0,
  win_rate numeric DEFAULT 0,
  profit_factor numeric DEFAULT 0,
  open_positions_count integer DEFAULT 0,
  user_note text,
  last_sync_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all accounts" ON public.trading_accounts FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trade History table
CREATE TABLE public.account_trade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset text NOT NULL,
  direction text NOT NULL,
  lot_size numeric NOT NULL DEFAULT 0,
  entry_price numeric NOT NULL DEFAULT 0,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  profit_loss numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  duration_minutes integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_trade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.account_trade_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trades" ON public.account_trade_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades" ON public.account_trade_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trade Journal Entries table
CREATE TABLE public.trade_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid REFERENCES public.account_trade_history(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  initial_idea text,
  motivation text,
  emotion text,
  mistakes text,
  did_well text,
  lesson_learned text,
  free_note text,
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal" ON public.trade_journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own journal" ON public.trade_journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal" ON public.trade_journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal" ON public.trade_journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all journal" ON public.trade_journal_entries FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_trading_accounts_updated_at BEFORE UPDATE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trade_journal_entries_updated_at BEFORE UPDATE ON public.trade_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
