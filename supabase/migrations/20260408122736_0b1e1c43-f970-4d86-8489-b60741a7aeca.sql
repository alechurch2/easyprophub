
ALTER TABLE public.shared_signals
  ADD COLUMN IF NOT EXISTS signal_source text NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS original_payload jsonb,
  ADD COLUMN IF NOT EXISTS modified_by uuid,
  ADD COLUMN IF NOT EXISTS modified_at timestamptz;

UPDATE public.shared_signals SET signal_source = 'ai' WHERE signal_source IS NULL;
