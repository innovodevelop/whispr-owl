-- Clean up old encryption tables since we've moved to Signal Protocol
-- The new tables (signal_*) provide better security architecture

-- Remove old conversation encryption keys table
DROP TABLE IF EXISTS conversation_encryption_keys CASCADE;

-- Remove old user encryption keys table  
DROP TABLE IF EXISTS user_encryption_keys CASCADE;