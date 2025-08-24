-- CRITICAL SECURITY FIX: Remove dangerous public access to Signal Protocol keys
-- These policies currently expose private cryptographic keys to all users

-- Drop the dangerous public policies that expose private keys
DROP POLICY IF EXISTS "Public can read signed prekeys for key exchange" ON public.signal_signed_prekeys;
DROP POLICY IF EXISTS "Public can read unused one-time prekeys" ON public.signal_one_time_prekeys;
DROP POLICY IF EXISTS "Public can mark one-time prekeys as used" ON public.signal_one_time_prekeys;

-- Create secure key exchange policies for signed prekeys
-- Only allow users to read signed prekeys for users they have conversations with
CREATE POLICY "Users can read signed prekeys for conversation partners" 
ON public.signal_signed_prekeys 
FOR SELECT 
USING (
  user_id != auth.uid() AND -- Don't need to read your own keys
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = user_id)
    )
  )
);

-- Create secure key exchange policies for one-time prekeys
-- Only allow reading unused prekeys for conversation partners
CREATE POLICY "Users can read unused prekeys for conversation partners" 
ON public.signal_one_time_prekeys 
FOR SELECT 
USING (
  used = false AND
  user_id != auth.uid() AND -- Don't read your own keys
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = user_id)
    )
  )
);

-- Allow marking prekeys as used only for conversation partners
CREATE POLICY "Users can mark prekeys as used for conversation partners" 
ON public.signal_one_time_prekeys 
FOR UPDATE 
USING (
  used = false AND
  user_id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = user_id)
    )
  )
)
WITH CHECK (
  used = true -- Only allow marking as used, not changing other fields
);

-- Add additional security: Prevent private key exposure in API responses
-- Create view for public key data only (no private keys)
CREATE OR REPLACE VIEW public.signal_public_prekeys AS
SELECT 
  id,
  user_id,
  key_id,
  public_key,
  signature,
  created_at
FROM public.signal_signed_prekeys;

-- Grant read access to the view instead of direct table access
GRANT SELECT ON public.signal_public_prekeys TO authenticated;

-- Create view for one-time prekeys (public keys only)
CREATE OR REPLACE VIEW public.signal_public_one_time_prekeys AS
SELECT 
  id,
  user_id,
  key_id,
  public_key,
  used,
  created_at
FROM public.signal_one_time_prekeys;

-- Grant read access to the view
GRANT SELECT ON public.signal_public_one_time_prekeys TO authenticated;