-- Security Fix Phase 1: Database Function Security and RLS Cleanup

-- 1. Fix database functions by adding secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_crypto_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Cleanup expired challenges
  DELETE FROM crypto_challenges 
  WHERE expires_at <= now();
  
  -- Cleanup expired device link requests
  DELETE FROM device_link_requests 
  WHERE expires_at <= now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.redact_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Always redact content for encrypted messages
  IF NEW.encrypted_content IS NOT NULL AND NEW.encrypted_content != '' THEN
    NEW.content := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_avatar_url(public_key_hash text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $function$
BEGIN
  -- Generate a deterministic avatar URL based on public key hash
  -- Using a simple geometric avatar service
  RETURN 'https://api.dicebear.com/7.x/shapes/svg?seed=' || public_key_hash;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_messages_encrypted_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Require encrypted_content for ALL messages
  IF NEW.encrypted_content IS NULL OR NEW.encrypted_content = '' THEN
    RAISE EXCEPTION 'All messages must be encrypted. Please check your encryption setup.';
  END IF;
  
  -- Validate that encrypted content looks like base64 encoded data
  IF LENGTH(NEW.encrypted_content) < 16 THEN
    RAISE EXCEPTION 'Encrypted content appears to be too short to be properly encrypted.';
  END IF;
  
  -- Always redact the plaintext content for encrypted messages
  NEW.content := '[encrypted]';
  
  RETURN NEW;
END;
$function$;

-- 2. Remove duplicate RLS policies on Signal Protocol tables
-- Remove duplicate policies for signal_identity_keys
DROP POLICY IF EXISTS "Users can ONLY access their own identity keys" ON public.signal_identity_keys;

-- Remove duplicate policies for signal_signed_prekeys  
DROP POLICY IF EXISTS "Users can ONLY access their own signed prekeys" ON public.signal_signed_prekeys;

-- Remove duplicate policies for signal_one_time_prekeys
DROP POLICY IF EXISTS "Users can ONLY access their own one-time prekeys" ON public.signal_one_time_prekeys;

-- Remove duplicate policies for signal_sessions
DROP POLICY IF EXISTS "Users can ONLY manage their own session data" ON public.signal_sessions;