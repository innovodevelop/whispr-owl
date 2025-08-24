-- Add Signal Protocol key storage tables

-- Identity keys (long-term keys for each user)
CREATE TABLE IF NOT EXISTS signal_identity_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  identity_key_public bytea NOT NULL,
  identity_key_private bytea NOT NULL,
  registration_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Signed prekeys (medium-term keys, signed by identity key)
CREATE TABLE IF NOT EXISTS signal_signed_prekeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key_id integer NOT NULL,
  public_key bytea NOT NULL,
  private_key bytea NOT NULL,
  signature bytea NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_id)
);

-- One-time prekeys (short-term keys for initial key exchange)
CREATE TABLE IF NOT EXISTS signal_one_time_prekeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key_id integer NOT NULL,
  public_key bytea NOT NULL,
  private_key bytea NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_id)
);

-- Session state for ongoing conversations
CREATE TABLE IF NOT EXISTS signal_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  local_user_id uuid NOT NULL,
  remote_user_id uuid NOT NULL,
  session_state bytea NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, local_user_id, remote_user_id)
);

-- Enable RLS on all tables
ALTER TABLE signal_identity_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_signed_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_one_time_prekeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_sessions ENABLE row level security;

-- RLS policies for identity keys
CREATE POLICY "Users can manage their own identity keys" ON signal_identity_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS policies for signed prekeys
CREATE POLICY "Users can manage their own signed prekeys" ON signal_signed_prekeys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public can read signed prekeys for key exchange
CREATE POLICY "Public can read signed prekeys for key exchange" ON signal_signed_prekeys
  FOR SELECT USING (true);

-- RLS policies for one-time prekeys
CREATE POLICY "Users can manage their own one-time prekeys" ON signal_one_time_prekeys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public can read unused one-time prekeys for key exchange
CREATE POLICY "Public can read unused one-time prekeys" ON signal_one_time_prekeys
  FOR SELECT USING (used = false);

-- Public can mark one-time prekeys as used
CREATE POLICY "Public can mark one-time prekeys as used" ON signal_one_time_prekeys
  FOR UPDATE USING (used = false) WITH CHECK (used = true);

-- RLS policies for sessions
CREATE POLICY "Users can manage sessions for their conversations" ON signal_sessions
  FOR ALL USING (
    auth.uid() = local_user_id AND 
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (participant_one = auth.uid() OR participant_two = auth.uid())
    )
  ) WITH CHECK (
    auth.uid() = local_user_id AND 
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (participant_one = auth.uid() OR participant_two = auth.uid())
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_signal_identity_keys_updated_at
  BEFORE UPDATE ON signal_identity_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signal_sessions_updated_at
  BEFORE UPDATE ON signal_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();