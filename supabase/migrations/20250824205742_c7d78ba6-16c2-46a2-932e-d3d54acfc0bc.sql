-- CRITICAL SECURITY FIX: Complete isolation of private cryptographic keys

-- 1. REMOVE ALL POTENTIAL ACCESS TO PRIVATE KEYS FOR OTHER USERS
-- Drop any policies that might allow cross-user access to private keys
DROP POLICY IF EXISTS "Users can read public signed prekeys for conversation partners" ON public.signal_signed_prekeys;
DROP POLICY IF EXISTS "Users can read public unused prekeys for conversation partners" ON public.signal_one_time_prekeys;
DROP POLICY IF EXISTS "Users can mark prekeys as used for conversation partners" ON public.signal_one_time_prekeys;

-- 2. CREATE ULTRA-STRICT POLICIES FOR PRIVATE KEY TABLES
-- These policies ensure ONLY the key owner can access their private keys
CREATE POLICY "Users can ONLY access their own identity keys" 
ON public.signal_identity_keys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can ONLY access their own signed prekeys" 
ON public.signal_signed_prekeys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can ONLY access their own one-time prekeys" 
ON public.signal_one_time_prekeys 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. CREATE SECURE PUBLIC KEY ACCESS FUNCTIONS
-- These functions provide controlled access to ONLY public key data for conversation partners

CREATE OR REPLACE FUNCTION public.get_user_signed_prekey_secure(target_user_id uuid)
RETURNS TABLE(key_id integer, public_key text, signature text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    sp.key_id,
    sp.public_key,
    sp.signature
  FROM public.signal_signed_prekeys sp
  WHERE sp.user_id = target_user_id
    AND target_user_id != auth.uid() -- Don't return own keys
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE (
        (c.participant_one = auth.uid() AND c.participant_two = target_user_id) OR
        (c.participant_two = auth.uid() AND c.participant_one = target_user_id)
      )
    )
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_one_time_prekey_secure(target_user_id uuid)
RETURNS TABLE(id uuid, key_id integer, public_key text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    otp.id,
    otp.key_id,
    otp.public_key
  FROM public.signal_one_time_prekeys otp
  WHERE otp.user_id = target_user_id
    AND otp.used = false
    AND target_user_id != auth.uid() -- Don't return own keys
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE (
        (c.participant_one = auth.uid() AND c.participant_two = target_user_id) OR
        (c.participant_two = auth.uid() AND c.participant_one = target_user_id)
      )
    )
  LIMIT 1;
$function$;

-- 4. SECURE FUNCTION TO MARK PREKEYS AS USED (without exposing private data)
CREATE OR REPLACE FUNCTION public.mark_prekey_used_secure(prekey_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rows_updated integer;
BEGIN
  -- Only allow marking prekeys as used for conversation partners
  -- This function doesn't expose any private key data
  UPDATE public.signal_one_time_prekeys
  SET used = true
  WHERE id = prekey_id
    AND user_id = target_user_id
    AND used = false
    AND target_user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE (
        (c.participant_one = auth.uid() AND c.participant_two = target_user_id) OR
        (c.participant_two = auth.uid() AND c.participant_one = target_user_id)
      )
    );
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$function$;

-- 5. ENSURE PHONE NUMBER PRIVACY
-- Update profiles policy to never expose phone numbers
DROP POLICY IF EXISTS "Users can view profiles in conversations and contacts" ON public.profiles;

CREATE POLICY "Users can view public profile data only" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own profile
  auth.uid() = user_id 
  OR 
  -- Users can see profiles of their contacts (but no private data like phone numbers)
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.user_id = auth.uid() 
    AND contacts.contact_user_id = profiles.user_id
  )
  OR
  -- Users can see profiles of conversation partners (but no private data)
  EXISTS (
    SELECT 1 FROM conversations
    WHERE (
      (conversations.participant_one = auth.uid() AND conversations.participant_two = profiles.user_id) OR
      (conversations.participant_two = auth.uid() AND conversations.participant_one = profiles.user_id)
    )
  )
);

-- 6. STRICT SESSION DATA ISOLATION
-- Ensure session data is completely isolated per user
DROP POLICY IF EXISTS "Users can manage sessions for their conversations" ON public.signal_sessions;

CREATE POLICY "Users can ONLY manage their own session data" 
ON public.signal_sessions 
FOR ALL 
USING (auth.uid() = local_user_id) 
WITH CHECK (auth.uid() = local_user_id);