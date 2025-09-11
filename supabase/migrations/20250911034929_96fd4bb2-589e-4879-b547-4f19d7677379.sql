-- CRITICAL SECURITY FIX: Create a view that properly restricts private key access
-- The RLS policy still allows conversation partners to see private keys
-- We need to implement column-level security

-- Create a secure view that hides private keys from other users
CREATE OR REPLACE VIEW public.signal_identity_keys_secure AS
SELECT 
  id,
  user_id,
  registration_id,
  identity_key_public,
  -- Only show private key to the owner, NULL for others
  CASE 
    WHEN auth.uid() = user_id THEN identity_key_private
    ELSE NULL
  END as identity_key_private,
  created_at,
  updated_at
FROM public.signal_identity_keys
WHERE 
  -- Users can see their own complete identity keys
  auth.uid() = user_id
  OR
  -- Conversation partners can see the record but private key will be NULL
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
  );

-- Grant access to the secure view
GRANT SELECT ON public.signal_identity_keys_secure TO authenticated;

-- Replace the overly permissive SELECT policy with a more restrictive one
DROP POLICY IF EXISTS "Users can view identity keys securely" ON public.signal_identity_keys;

-- Create a highly restrictive SELECT policy that only allows users to see their own keys
CREATE POLICY "Users can only view their own identity keys"
  ON public.signal_identity_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Update the existing function to use only public keys
CREATE OR REPLACE FUNCTION public.get_user_identity_public_key(target_user_id uuid)
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