-- Add read receipts and disappearing message features to messages table
ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add disappearing message settings to user_settings
ALTER TABLE user_settings ADD COLUMN disappearing_message_duration INTEGER DEFAULT NULL; -- Duration in minutes, NULL means never disappear

-- Create function to automatically clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages 
  WHERE expires_at IS NOT NULL 
    AND expires_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for conversations table (messages already has it)
ALTER TABLE conversations REPLICA IDENTITY FULL;