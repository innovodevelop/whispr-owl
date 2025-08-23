-- Security Fix: Protect phone numbers from contact harvesting

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

-- 4. Migrate existing phone numbers to private table
INSERT INTO public.private_profile_data (user_id, phone_number)
SELECT user_id, phone_number 
FROM public.profiles 
WHERE phone_number IS NOT NULL;

-- 5. Remove phone_number from public profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;

-- 6. Create secure search function that doesn't expose phone numbers to others
DROP FUNCTION IF EXISTS public.search_users_by_query(text);

CREATE OR REPLACE FUNCTION public.search_users_by_query_secure(search_term text)
 RETURNS TABLE(user_id uuid, username text, display_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- First try exact username/display name matches (most relevant)
  SELECT 
    p.user_id,
    p.username,
    p.display_name
  FROM public.profiles p
  WHERE 
    (
      p.username ILIKE search_term || '%'
      OR p.display_name ILIKE search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
      OR p.display_name ILIKE '%' || search_term || '%'
    )
    AND p.user_id != auth.uid()  -- Don't return current user
    AND (p.username IS NOT NULL OR p.display_name IS NOT NULL)
  
  UNION
  
  -- Then search by phone number, but only return user_id and basic info
  -- Phone number itself is NOT returned for privacy
  SELECT 
    p.user_id,
    p.username,
    p.display_name
  FROM public.profiles p
  INNER JOIN public.private_profile_data ppd ON p.user_id = ppd.user_id
  WHERE 
    ppd.phone_number ILIKE '%' || search_term || '%'
    AND p.user_id != auth.uid()
    AND ppd.phone_number IS NOT NULL
  
  LIMIT 20;
$function$

-- 7. Create trigger for private profile data timestamps
CREATE TRIGGER update_private_profile_data_updated_at
BEFORE UPDATE ON public.private_profile_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();