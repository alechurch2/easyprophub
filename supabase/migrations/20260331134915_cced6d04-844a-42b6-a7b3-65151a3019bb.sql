
-- Seed license settings for all existing users who don't have one yet
INSERT INTO public.user_license_settings (user_id)
SELECT p.user_id FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_license_settings ls WHERE ls.user_id = p.user_id);
