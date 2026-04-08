-- 1. Remove account_trade_history from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.account_trade_history;

-- 2. Make chart-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chart-screenshots';

-- 3. Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';