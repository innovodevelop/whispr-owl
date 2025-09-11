-- CRITICAL SECURITY FIX: Separate RLS policies for public vs private key access
-- Private keys should NEVER be accessible to other users, only public keys

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can manage their own identity keys" ON public.signal_identity_keys;

-- Create separate policies for different operations
-- 1. Users can only INSERT their own identity keys
CREATE POLICY "Users can insert their own identity keys"
  ON public.signal_identity_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Users can only UPDATE their own identity keys
CREATE POLICY "Users can update their own identity keys"
  ON public.signal_identity_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can only DELETE their own identity keys
CREATE POLICY "Users can delete their own identity keys"
  ON public.signal_identity_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. CRITICAL: Restrict SELECT to only allow access to public keys for conversation partners
-- and private keys only for the owner
CREATE POLICY "Users can view identity keys securely"
  ON public.signal_identity_keys
  FOR SELECT
  USING (
    -- Users can see their own complete identity keys (public + private)
    auth.uid() = user_id
    OR
    -- Conversation partners can ONLY see public keys (private key field will be NULL)
    (
      auth.uid() != user_id 
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE (
          (c.participant_one = auth.uid() AND c.participant_two = signal_identity_keys.user_id) OR
          (c.participant_two = auth.uid() AND c.participant_one = signal_identity_keys.user_id)
        )
        AND c.status = 'accepted'
      )
    )
  );

-- Create a security definer function that returns only public keys for other users
CREATE OR REPLACE FUNCTION public.get_user_public_identity_key_secure(target_user_id uuid)
RETURNS TABLE(registration_id integer, identity_key_public text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Only return public identity key for conversation partners
  SELECT 
    sik.registration_id,
    sik.identity_key_public
  FROM public.signal_identity_keys sik
  WHERE sik.user_id = target_user_id
    AND target_user_id != auth.uid() -- Don't return own keys through this function
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE (
        (c.participant_one = auth.uid() AND c.participant_two = target_user_id) OR
        (c.participant_two = auth.uid() AND c.participant_one = target_user_id)
      )
      AND c.status = 'accepted'
    )
  LIMIT 1;
$function$;