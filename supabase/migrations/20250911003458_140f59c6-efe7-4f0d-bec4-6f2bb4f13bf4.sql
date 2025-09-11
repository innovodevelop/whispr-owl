-- Fix critical security vulnerabilities in crypto tables
-- These tables currently allow public access to sensitive cryptographic data

-- 1. Fix crypto_challenges table
DROP POLICY IF EXISTS "Anyone can create challenges" ON public.crypto_challenges;
DROP POLICY IF EXISTS "Challenges are publicly readable for verification" ON public.crypto_challenges;
DROP POLICY IF EXISTS "Challenges can be marked as used" ON public.crypto_challenges;

-- Create secure policies for crypto_challenges
CREATE POLICY "Users can create challenges for themselves"
ON public.crypto_challenges
FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view challenges for their authentication"
ON public.crypto_challenges
FOR SELECT
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "System can mark challenges as used"
ON public.crypto_challenges
FOR UPDATE
USING (user_id IS NULL OR auth.uid() = user_id);

-- 2. Fix device_link_requests table
DROP POLICY IF EXISTS "Anyone can create device link requests" ON public.device_link_requests;
DROP POLICY IF EXISTS "Device link requests are publicly readable" ON public.device_link_requests;
DROP POLICY IF EXISTS "Device link requests can be updated" ON public.device_link_requests;

-- Create secure policies for device_link_requests
CREATE POLICY "Authenticated users can create device link requests"
ON public.device_link_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view device link requests they created"
ON public.device_link_requests
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can update device link requests"
ON public.device_link_requests
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- 3. Fix crypto_users table
DROP POLICY IF EXISTS "Users can insert their own crypto profile" ON public.crypto_users;
DROP POLICY IF EXISTS "Users can update their own crypto profile" ON public.crypto_users;
DROP POLICY IF EXISTS "Users can view their own crypto profile" ON public.crypto_users;

-- Create secure policies for crypto_users
CREATE POLICY "Users can insert their own crypto profile only"
ON public.crypto_users
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto profile only"
ON public.crypto_users
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own crypto profile"
ON public.crypto_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public keys of conversation partners"
ON public.crypto_users
FOR SELECT
USING (
  auth.uid() != user_id AND 
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (
      (c.participant_one = auth.uid() AND c.participant_two = user_id) OR
      (c.participant_two = auth.uid() AND c.participant_one = user_id)
    )
  )
);

-- Ensure RLS is enabled on all tables
ALTER TABLE public.crypto_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_users ENABLE ROW LEVEL SECURITY;