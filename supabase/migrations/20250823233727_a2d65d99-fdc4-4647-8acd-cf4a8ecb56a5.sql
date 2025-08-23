-- Security Fix Part 1: Create private profile data table

-- 1. Create private profile data table for sensitive information
CREATE TABLE public.private_profile_data (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS on private table
ALTER TABLE public.private_profile_data ENABLE ROW LEVEL SECURITY;

-- 3. Create strict RLS policy - only user can see their own private data
CREATE POLICY "Users can only access their own private data"
ON public.private_profile_data
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);