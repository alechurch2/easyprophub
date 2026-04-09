ALTER TABLE public.user_license_settings
ADD COLUMN delta_zero_enabled boolean NOT NULL DEFAULT false;