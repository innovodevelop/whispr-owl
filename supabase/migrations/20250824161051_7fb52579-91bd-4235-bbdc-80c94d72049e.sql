-- Add encryption support to the database schema

-- Table for storing user encryption keys
CREATE TABLE IF NOT EXISTS user_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing conversation encryption keys
CREATE TABLE IF NOT EXISTS conversation_encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  encrypted_key_for_participant_one TEXT NOT NULL,
  encrypted_key_for_participant_two TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, key_version)
);

-- Add encrypted content fields to existing tables
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encrypted_display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS encrypted_bio TEXT;

-- Enable RLS for encryption tables
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_encryption_keys
CREATE POLICY "Users can manage their own encryption keys" 
ON user_encryption_keys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for conversation_encryption_keys
CREATE POLICY "Participants can access conversation encryption keys" 
ON conversation_encryption_keys 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_encryption_keys.conversation_id 
    AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

CREATE POLICY "Conversation creators can insert encryption keys" 
ON conversation_encryption_keys 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_encryption_keys.conversation_id 
    AND c.created_by = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id ON user_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_encryption_keys_conversation_id ON conversation_encryption_keys(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at DESC);

-- Update timestamp trigger for encryption tables
CREATE TRIGGER update_user_encryption_keys_updated_at
    BEFORE UPDATE ON user_encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_encryption_keys_updated_at
    BEFORE UPDATE ON conversation_encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();