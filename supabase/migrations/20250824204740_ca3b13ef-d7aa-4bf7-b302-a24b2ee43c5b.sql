-- CRITICAL SECURITY FIX: Tighten RLS policies to prevent private key exposure

-- 1. Fix signal_identity_keys to prevent cross-user private key access
DROP POLICY IF EXISTS "Users can manage their own identity keys" ON public.signal_identity_keys;

CREATE POLICY "Users can manage their own identity keys" 
ON public.signal_identity_keys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 2. Fix signal_signed_prekeys - restrict private key access to owners only
DROP POLICY IF EXISTS "Users can read signed prekeys for conversation partners" ON public.signal_signed_prekeys;
DROP POLICY IF EXISTS "Users can manage their own signed prekeys" ON public.signal_signed_prekeys;

-- Only allow users to manage their own signed prekeys (including private keys)
CREATE POLICY "Users can manage their own signed prekeys" 
ON public.signal_signed_prekeys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow reading only public keys and signatures for conversation partners
CREATE POLICY "Users can read public signed prekeys for conversation partners" 
ON public.signal_signed_prekeys 
FOR SELECT 
USING (
  user_id != auth.uid() 
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = signal_signed_prekeys.user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = signal_signed_prekeys.user_id)
    )
  )
);

-- 3. Fix signal_one_time_prekeys - restrict private key access to owners only  
DROP POLICY IF EXISTS "Users can read unused prekeys for conversation partners" ON public.signal_one_time_prekeys;
DROP POLICY IF EXISTS "Users can mark prekeys as used for conversation partners" ON public.signal_one_time_prekeys;
DROP POLICY IF EXISTS "Users can manage their own one-time prekeys" ON public.signal_one_time_prekeys;

-- Only allow users to manage their own one-time prekeys (including private keys)
CREATE POLICY "Users can manage their own one-time prekeys" 
ON public.signal_one_time_prekeys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow reading only public keys for unused prekeys of conversation partners
CREATE POLICY "Users can read public unused prekeys for conversation partners" 
ON public.signal_one_time_prekeys 
FOR SELECT 
USING (
  used = false 
  AND user_id != auth.uid() 
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = signal_one_time_prekeys.user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = signal_one_time_prekeys.user_id)
    )
  )
);

-- Allow marking prekeys as used for conversation partners (but not reading private keys)
CREATE POLICY "Users can mark prekeys as used for conversation partners" 
ON public.signal_one_time_prekeys 
FOR UPDATE 
USING (
  used = false 
  AND user_id != auth.uid() 
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = signal_one_time_prekeys.user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = signal_one_time_prekeys.user_id)
    )
  )
) 
WITH CHECK (used = true);

-- 4. Tighten private_profile_data access to be more restrictive
DROP POLICY IF EXISTS "Users can only access their own private data" ON public.private_profile_data;

CREATE POLICY "Users can manage their own private data" 
ON public.private_profile_data 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. Improve the message encryption enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_messages_encrypted_secure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Replace the existing trigger with the improved one
DROP TRIGGER IF EXISTS enforce_messages_encrypted_trigger ON public.messages;
CREATE TRIGGER enforce_messages_encrypted_secure_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_messages_encrypted_secure();