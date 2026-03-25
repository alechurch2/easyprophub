
CREATE TABLE public.ai_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nuova conversazione',
  mode text NOT NULL DEFAULT 'trading_questions',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.ai_chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.ai_chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.ai_chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.ai_chat_conversations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations" ON public.ai_chat_conversations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own conversations" ON public.ai_chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in own conversations" ON public.ai_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all messages" ON public.ai_chat_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_chat_conversations_updated_at
  BEFORE UPDATE ON public.ai_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
