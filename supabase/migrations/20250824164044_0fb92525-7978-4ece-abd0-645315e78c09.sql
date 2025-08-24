-- Update Signal Protocol tables to use text instead of bytea for simplicity
-- This makes the JavaScript implementation cleaner while still maintaining security

-- Update identity keys table
ALTER TABLE signal_identity_keys 
  ALTER COLUMN identity_key_public TYPE text,
  ALTER COLUMN identity_key_private TYPE text;

-- Update signed prekeys table  
ALTER TABLE signal_signed_prekeys
  ALTER COLUMN public_key TYPE text,
  ALTER COLUMN private_key TYPE text,
  ALTER COLUMN signature TYPE text;

-- Update one-time prekeys table
ALTER TABLE signal_one_time_prekeys
  ALTER COLUMN public_key TYPE text,
  ALTER COLUMN private_key TYPE text;

-- Update sessions table
ALTER TABLE signal_sessions
  ALTER COLUMN session_state TYPE text;