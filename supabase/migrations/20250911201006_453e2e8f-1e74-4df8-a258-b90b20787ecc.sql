-- Phase 1: Database Security Hardening - Fix Dependencies First
-- Handle view dependencies before dropping private key columns

-- 1. Drop the signal_identity_keys_secure view that depends on private key column
DROP VIEW IF EXISTS public.signal_identity_keys_secure CASCADE;

-- 2. Now safely remove private keys from signal_identity_keys table
ALTER TABLE public.signal_identity_keys DROP COLUMN IF EXISTS identity_key_private;

-- Add comment to document this security change
COMMENT ON TABLE public.signal_identity_keys IS 'Signal Protocol identity keys - ONLY public keys stored. Private keys must remain client-side only for security.';

-- 3. Remove private keys from signal_signed_prekeys table  
ALTER TABLE public.signal_signed_prekeys DROP COLUMN IF EXISTS private_key;

-- Add comment to document this security change
COMMENT ON TABLE public.signal_signed_prekeys IS 'Signal Protocol signed prekeys - ONLY public keys and signatures stored. Private keys must remain client-side only for security.';

-- 4. Remove private keys from signal_one_time_prekeys table
ALTER TABLE public.signal_one_time_prekeys DROP COLUMN IF EXISTS private_key;

-- Add comment to document this security change  
COMMENT ON TABLE public.signal_one_time_prekeys IS 'Signal Protocol one-time prekeys - ONLY public keys stored. Private keys must remain client-side only for security.';

-- 5. Recreate the secure view WITHOUT private key access
CREATE VIEW public.signal_identity_keys_secure 
WITH (security_invoker=true) AS
SELECT 
  id,
  user_id,
  registration_id,
  identity_key_public,
  created_at,
  updated_at
FROM public.signal_identity_keys
WHERE auth.uid() = user_id;

-- Add security comment to the view
COMMENT ON VIEW public.signal_identity_keys_secure IS 'Secure view that shows only public Signal Protocol identity keys for the authenticated user. Private keys are never stored or accessible server-side.';

-- 6. Strengthen phone number privacy - ensure private_profile_data is completely isolated
DROP POLICY IF EXISTS "Users can manage their own private data" ON public.private_profile_data;

CREATE POLICY "Users can only access their own private data - strict isolation"
ON public.private_profile_data
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);