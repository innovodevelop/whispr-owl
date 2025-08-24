-- Fix security definer view issues and remaining security warnings

-- Drop the problematic views created in previous migration
DROP VIEW IF EXISTS public.signal_public_prekeys;
DROP VIEW IF EXISTS public.signal_public_one_time_prekeys;

-- Revoke the grants we made
REVOKE SELECT ON public.signal_public_prekeys FROM authenticated;
REVOKE SELECT ON public.signal_public_one_time_prekeys FROM authenticated;

-- Create secure functions for key exchange instead of views
-- These functions will only return public key data (no private keys)
CREATE OR REPLACE FUNCTION public.get_user_signed_prekey(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  key_id integer,
  public_key text,
  signature text,
  created_at timestamp with time zone
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    sp.id,
    sp.user_id,
    sp.key_id,
    sp.public_key,
    sp.signature,
    sp.created_at
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
$$;

CREATE OR REPLACE FUNCTION public.get_user_one_time_prekey(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  key_id integer,
  public_key text
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    otp.id,
    otp.user_id,
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
$$;

-- Create function to mark one-time prekey as used
CREATE OR REPLACE FUNCTION public.mark_prekey_used(prekey_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE SQL
SECURITY DEFINER
AS $$
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
  
  SELECT FOUND;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_user_signed_prekey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_one_time_prekey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_prekey_used(uuid, uuid) TO authenticated;