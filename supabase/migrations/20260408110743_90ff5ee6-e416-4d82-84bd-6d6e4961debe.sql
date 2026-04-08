-- 1. Storage UPDATE policies for all buckets (owner-scoped)

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own chart screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chart-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chart-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own chat attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own support attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Course-assets: admin-only DELETE and UPDATE

CREATE POLICY "Admins can update course assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-assets' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'course-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete course assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-assets' AND has_role(auth.uid(), 'admin'::app_role));