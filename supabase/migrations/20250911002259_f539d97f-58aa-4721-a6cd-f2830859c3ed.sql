-- Update crypto_register edge function to handle enhanced device fingerprinting
-- Add device fingerprinting and username support to crypto_users table

ALTER TABLE public.crypto_users 
ADD COLUMN IF NOT EXISTS device_fingerprint JSONB,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_crypto_users_username ON public.crypto_users(username);
CREATE INDEX IF NOT EXISTS idx_crypto_users_device_id ON public.crypto_users(device_id);

-- Update crypto_devices table to include device fingerprinting
ALTER TABLE public.crypto_devices 
ADD COLUMN IF NOT EXISTS device_fingerprint JSONB;

-- Create a function to generate avatar from public key hash
CREATE OR REPLACE FUNCTION public.generate_avatar_url(public_key_hash TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate a deterministic avatar URL based on public key hash
  -- Using a simple geometric avatar service
  RETURN 'https://api.dicebear.com/7.x/shapes/svg?seed=' || public_key_hash;
END;
$$;