-- Create conversation_settings table for per-chat settings
CREATE TABLE IF NOT EXISTS public.conversation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  disappearing_enabled BOOLEAN NOT NULL DEFAULT false,
  disappearing_duration INTEGER, -- Duration in minutes, NULL means disabled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one setting per user per conversation
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation_settings
CREATE POLICY "Users can manage their own conversation settings" 
ON public.conversation_settings 
FOR ALL 
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_settings.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_settings.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_settings_updated_at
BEFORE UPDATE ON public.conversation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();