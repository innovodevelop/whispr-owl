-- Update the search function to include phone number search
DROP FUNCTION IF EXISTS public.search_users_by_username(text);

CREATE OR REPLACE FUNCTION public.search_users_by_query(search_term text)
 RETURNS TABLE(user_id uuid, username text, display_name text, phone_number text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.username,
    p.display_name,
    p.phone_number
  FROM public.profiles p
  WHERE 
    (
      p.username ILIKE '%' || search_term || '%'
      OR p.display_name ILIKE '%' || search_term || '%'
      OR p.phone_number ILIKE '%' || search_term || '%'
    )
    AND p.user_id != auth.uid()  -- Don't return current user
    AND (p.username IS NOT NULL OR p.phone_number IS NOT NULL OR p.display_name IS NOT NULL)
  LIMIT 20;
$function$