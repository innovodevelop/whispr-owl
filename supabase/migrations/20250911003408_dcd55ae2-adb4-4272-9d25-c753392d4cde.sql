-- Fix crypto_devices RLS policies to restrict access to device owners only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own devices" ON public.crypto_devices;
DROP POLICY IF EXISTS "Users can update their own devices" ON public.crypto_devices;
DROP POLICY IF EXISTS "Users can insert their own devices" ON public.crypto_devices;

-- Create secure policies that restrict access to device owners only
CREATE POLICY "Users can view only their own devices" 
ON public.crypto_devices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices only" 
ON public.crypto_devices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own devices" 
ON public.crypto_devices 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete only their own devices" 
ON public.crypto_devices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE public.crypto_devices ENABLE ROW LEVEL SECURITY;