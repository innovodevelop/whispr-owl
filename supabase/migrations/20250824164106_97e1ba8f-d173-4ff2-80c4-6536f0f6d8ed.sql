-- Address security warnings from the linter

-- Fix Auth OTP long expiry by updating auth configuration
-- This reduces the OTP validity period to a more secure timeframe
UPDATE auth.config 
SET raw_auth_global_settings = raw_auth_global_settings || '{"otp_expiry": 300}'::jsonb
WHERE TRUE;

-- Note: Leaked password protection can only be enabled through the Supabase dashboard
-- This requires manual configuration in the Auth settings