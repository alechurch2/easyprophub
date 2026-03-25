-- Add image_url column to ai_chat_messages
ALTER TABLE public.ai_chat_messages ADD COLUMN image_url text;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat-attachments bucket
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);