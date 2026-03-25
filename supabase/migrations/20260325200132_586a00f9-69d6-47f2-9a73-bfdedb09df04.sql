
-- Add license fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS access_started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS access_expires_at timestamp with time zone;

-- Update existing approved users to have 'active' license and lifetime-like (no expiry)
UPDATE public.profiles SET license_status = 'active', access_started_at = created_at WHERE status = 'approved';
UPDATE public.profiles SET license_status = 'pending' WHERE status = 'pending';
UPDATE public.profiles SET license_status = 'suspended' WHERE status = 'suspended';

-- Create a security definer function to check license validity
CREATE OR REPLACE FUNCTION public.is_license_valid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'approved'
      AND license_status IN ('active', 'lifetime')
      AND (access_expires_at IS NULL OR access_expires_at > now())
  )
$$;
