-- Drop and recreate the signal_identity_keys_secure view with proper security
DROP VIEW IF EXISTS public.signal_identity_keys_secure;

-- Create a secure view that only shows users their own identity keys
-- This ensures complete privacy - users can only see their own keys, period
CREATE VIEW public.signal_identity_keys_secure AS
SELECT 
  id,
  user_id,
  registration_id,
  identity_key_public,
  identity_key_private,
  created_at,
  updated_at
FROM public.signal_identity_keys
WHERE auth.uid() = user_id;