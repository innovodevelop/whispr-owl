-- Complete security fix: Remove phone numbers from profiles table
-- This addresses the critical security vulnerability where phone numbers 
-- could be harvested by contacts through the profiles table RLS policy

-- 1. First migrate any remaining phone numbers to private table
INSERT INTO public.private_profile_data (user_id, phone_number)
SELECT user_id, phone_number 
FROM public.profiles 
WHERE phone_number IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  updated_at = now();

-- 2. Remove phone_number column from public profiles table (critical security fix)
ALTER TABLE public.profiles DROP COLUMN phone_number;

-- 3. Update search function to exclude phone numbers from public results
DROP FUNCTION IF EXISTS public.search_users_by_query(text);

CREATE OR REPLACE FUNCTION public.search_users_by_query_secure(search_term text)
 RETURNS TABLE(user_id uuid, username text, display_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Search by username and display name only (phone numbers are now private)
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
  
  -- Allow phone number search but only return basic info (no phone number exposed)
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