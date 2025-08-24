-- Update the messages table to allow the new financial_notification message type
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add the updated constraint with the new message type
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'financial_notification'));