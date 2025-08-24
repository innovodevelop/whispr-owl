-- Update RLS policy for profiles to allow viewing users you have conversations with
DROP POLICY IF EXISTS "Users can view own profile and connected users" ON public.profiles;

CREATE POLICY "Users can view profiles in conversations and contacts" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.user_id = auth.uid() 
    AND contacts.contact_user_id = profiles.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE (
      (conversations.participant_one = auth.uid() AND conversations.participant_two = profiles.user_id)
      OR 
      (conversations.participant_two = auth.uid() AND conversations.participant_one = profiles.user_id)
    )
  )
);

-- Update messages policy to allow read receipts (UPDATE for read_at)
CREATE POLICY "Users can mark messages as read in their conversations" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND ((c.participant_one = auth.uid()) OR (c.participant_two = auth.uid())) 
    AND c.status = 'accepted'
  )
)
WITH CHECK (
  -- Only allow updating read_at timestamp
  OLD.id = NEW.id 
  AND OLD.conversation_id = NEW.conversation_id 
  AND OLD.sender_id = NEW.sender_id 
  AND OLD.content = NEW.content 
  AND OLD.message_type = NEW.message_type 
  AND OLD.created_at = NEW.created_at 
  AND OLD.expires_at = NEW.expires_at
);