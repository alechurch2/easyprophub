-- 1. Add CHECK constraint to restrict role values
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'));

-- 2. Replace the INSERT policy to only allow 'user' role for authenticated users
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.ai_chat_messages;

CREATE POLICY "Users can create messages in own conversations"
ON public.ai_chat_messages
FOR INSERT
TO public
WITH CHECK (
  role = 'user'
  AND EXISTS (
    SELECT 1 FROM ai_chat_conversations
    WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
    AND ai_chat_conversations.user_id = auth.uid()
  )
);

-- 3. Allow service_role to insert assistant/system messages
CREATE POLICY "Service role can insert any messages"
ON public.ai_chat_messages
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role'::text);