
ALTER TABLE public.shared_signals 
ADD COLUMN signal_status text NOT NULL DEFAULT 'active',
ADD COLUMN status_updated_at timestamp with time zone DEFAULT now();
