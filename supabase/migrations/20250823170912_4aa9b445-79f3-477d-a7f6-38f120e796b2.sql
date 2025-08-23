-- Fix security issue: Remove public access to profiles table
-- Replace the overly permissive policy with secure ones

-- Drop the insecure policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure policies for profiles access
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow viewing basic profile info (username only) for user discovery
-- This is needed for the find people / contacts functionality
CREATE POLICY "Authenticated users can view usernames for discovery"
ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND (
    -- Only expose username for discovery, not full profile
    TRUE
  )
);

-- Actually, let's be more restrictive and create a view for safe profile discovery
-- First, drop the above policy
DROP POLICY IF EXISTS "Authenticated users can view usernames for discovery" ON public.profiles;

-- Create a more secure policy: users can only see profiles they have contact relationships with
-- For now, let's allow authenticated users to see basic info for discovery but we'll create a contacts table later
CREATE POLICY "Authenticated users can view profiles for discovery"
ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    -- Users can always see their own profile
    auth.uid() = user_id
    -- For others, only basic discovery (we'll improve this with contacts table)
    OR auth.uid() IS NOT NULL
  )
);

-- Create a contacts table to properly manage who can see whose profile
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id),
  -- Prevent users from adding themselves as contacts
  CONSTRAINT no_self_contact CHECK (user_id != contact_user_id)
);

-- Enable RLS on contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts
CREATE POLICY "Users can view their own contacts"
ON public.contacts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add contacts"
ON public.contacts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their contacts"
ON public.contacts
FOR DELETE
USING (auth.uid() = user_id);

-- Now update the profiles policy to be more restrictive
-- Drop the current permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles for discovery" ON public.profiles;

-- Create a secure policy that respects contact relationships
CREATE POLICY "Users can view own profile and connected users"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  -- Can view profiles of users who are in their contacts
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.user_id = auth.uid() 
    AND contacts.contact_user_id = profiles.user_id
  )
);

-- For user discovery (finding people), we'll create a separate function that only returns minimal info
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_term TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.user_id,
    p.username,
    p.display_name
  FROM public.profiles p
  WHERE 
    p.username ILIKE '%' || search_term || '%'
    AND p.user_id != auth.uid()  -- Don't return current user
    AND p.username IS NOT NULL
  LIMIT 20;
$$;