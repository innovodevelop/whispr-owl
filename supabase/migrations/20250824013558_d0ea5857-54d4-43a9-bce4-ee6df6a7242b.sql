-- Allow participants to delete messages in their conversations
CREATE POLICY "Participants can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
      AND c.status = 'accepted'
  )
);
