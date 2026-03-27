
CREATE TABLE public.shared_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.ai_chart_reviews(id),
  created_by uuid NOT NULL,
  asset text NOT NULL,
  direction text NOT NULL,
  order_type text NOT NULL DEFAULT 'market',
  entry_price numeric NOT NULL,
  stop_loss numeric NOT NULL,
  take_profit numeric NOT NULL,
  lot_size_suggestion numeric,
  signal_strength integer DEFAULT 3,
  signal_quality text,
  explanation text,
  review_mode text DEFAULT 'easy',
  review_tier text DEFAULT 'standard',
  is_published boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  expires_at timestamptz,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage signals" ON public.shared_signals FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved users can view published signals" ON public.shared_signals FOR SELECT TO authenticated USING (is_published = true AND is_archived = false AND get_user_status(auth.uid()) = 'approved'::user_status);
