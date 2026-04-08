
-- Add CHECK constraint to restrict role values
ALTER TABLE public.ai_chat_messages ADD CONSTRAINT valid_chat_role CHECK (role IN ('user', 'assistant', 'system'));

-- Drop the existing permissive user INSERT policy
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.ai_chat_messages;

-- Re-create it restricting to role = 'user' only
CREATE POLICY "Users can create messages in own conversations"
ON public.ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'user'
  AND EXISTS (
    SELECT 1 FROM ai_chat_conversations
    WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
      AND ai_chat_conversations.user_id = auth.uid()
  )
);
