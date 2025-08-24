-- FINAL SECURITY FIX: Use column-level restrictions to prevent private key exposure

-- Create secure functions for accessing public keys only
CREATE OR REPLACE FUNCTION public.get_user_identity_public_key(target_user_id uuid)
RETURNS TABLE(registration_id integer, identity_key_public text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    sik.registration_id,
    sik.identity_key_public
  FROM public.signal_identity_keys sik
  WHERE sik.user_id = target_user_id
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

-- Update the webSignalProtocol.ts to use these secure functions
-- Remove the problematic SELECT policies that expose private keys
DROP POLICY IF EXISTS "Users can read public signed prekeys for conversation partners" ON public.signal_signed_prekeys;
DROP POLICY IF EXISTS "Users can read public unused prekeys for conversation partners" ON public.signal_one_time_prekeys;

-- The existing secure functions (get_user_signed_prekey and get_user_one_time_prekey) already handle this properly
-- These functions only return public keys and are already being used in the Signal Protocol implementation

-- Update signal_sessions to be more restrictive
DROP POLICY IF EXISTS "Users can manage sessions for their conversations" ON public.signal_sessions;

CREATE POLICY "Users can manage their own session data" 
ON public.signal_sessions 
FOR ALL 
USING (auth.uid() = local_user_id) 
WITH CHECK (auth.uid() = local_user_id);

-- Ensure the secure functions prevent any private key leakage
-- The get_user_signed_prekey and get_user_one_time_prekey functions are already secure
-- They only return public keys and are properly access-controlled