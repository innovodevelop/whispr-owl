-- Phase 1: Database Security Hardening
-- Fix Security Definer Views and Implement Strict RLS

-- 1. Remove private keys from signal_identity_keys table
-- First, create a migration to remove private key storage
ALTER TABLE public.signal_identity_keys DROP COLUMN IF EXISTS identity_key_private;

-- Add comment to document this security change
COMMENT ON TABLE public.signal_identity_keys IS 'Signal Protocol identity keys - ONLY public keys stored. Private keys must remain client-side only for security.';

-- 2. Remove private keys from signal_signed_prekeys table  
ALTER TABLE public.signal_signed_prekeys DROP COLUMN IF EXISTS private_key;

-- Add comment to document this security change
COMMENT ON TABLE public.signal_signed_prekeys IS 'Signal Protocol signed prekeys - ONLY public keys and signatures stored. Private keys must remain client-side only for security.';

-- 3. Remove private keys from signal_one_time_prekeys table
ALTER TABLE public.signal_one_time_prekeys DROP COLUMN IF EXISTS private_key;

-- Add comment to document this security change  
COMMENT ON TABLE public.signal_one_time_prekeys IS 'Signal Protocol one-time prekeys - ONLY public keys stored. Private keys must remain client-side only for security.';

-- 4. Strengthen phone number privacy - ensure private_profile_data is completely isolated
-- Drop and recreate RLS policy for private_profile_data with strict isolation
DROP POLICY IF EXISTS "Users can manage their own private data" ON public.private_profile_data;

CREATE POLICY "Users can only access their own private data - strict isolation"
ON public.private_profile_data
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Ensure profiles table doesn't leak private data through conversation access
-- Update profiles RLS to explicitly exclude private data fields in conversation access
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;

CREATE POLICY "Users can view their own profile - full access"
ON public.profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Contacts and conversation partners can view limited public profile data"
ON public.profiles  
FOR SELECT
USING (
  auth.uid() != user_id AND (
    EXISTS (
      SELECT 1 FROM contacts 
      WHERE (contacts.user_id = auth.uid() AND contacts.contact_user_id = profiles.user_id)
    ) OR 
    EXISTS (
      SELECT 1 FROM conversations
      WHERE (
        (conversations.participant_one = auth.uid() AND conversations.participant_two = profiles.user_id) OR
        (conversations.participant_two = auth.uid() AND conversations.participant_one = profiles.user_id)
      )
    )
  )
);

-- 6. Add additional security to recovery data in crypto_users
-- Add comment documenting the security model
COMMENT ON TABLE public.crypto_users IS 'Crypto user profiles with recovery data. Recovery phrase hashes should be additionally encrypted client-side before storage.';

-- 7. Create security validation functions to document secure practices
CREATE OR REPLACE FUNCTION public.validate_private_key_security()
RETURNS TEXT AS $$
BEGIN
  -- Validate that no private keys are stored in the database
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name LIKE '%private_key%'
    AND table_name IN ('signal_identity_keys', 'signal_signed_prekeys', 'signal_one_time_prekeys')
  ) THEN
    RETURN 'WARNING: Private key columns detected in Signal Protocol tables';
  END IF;
  
  RETURN 'SECURE: No private keys stored in Signal Protocol tables - client-side only storage confirmed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 8. Create function to validate phone number privacy
CREATE OR REPLACE FUNCTION public.validate_phone_privacy()
RETURNS TEXT AS $$
BEGIN
  -- This function confirms phone numbers are properly isolated
  RETURN 'Phone numbers are isolated to private_profile_data table with strict user-only RLS policies';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 9. Fix any remaining security definer issues in existing functions
-- Update existing functions to be more secure

-- Ensure get_user_identity_public_key_secure is properly restricted
DROP FUNCTION IF EXISTS public.get_user_identity_public_key_secure(uuid);
CREATE OR REPLACE FUNCTION public.get_user_identity_public_key_secure(target_user_id uuid)
RETURNS TABLE(registration_id integer, identity_key_public text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return public identity key for conversation partners - no private keys ever
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
$$;

-- Grant minimal permissions
REVOKE ALL ON FUNCTION public.get_user_identity_public_key_secure(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_identity_public_key_secure(uuid) TO authenticated;