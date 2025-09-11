-- SECURITY FIX: Remove phone number search capability to prevent privacy violations
-- Phone numbers should never be searchable by other users, even indirectly

CREATE OR REPLACE FUNCTION public.search_users_by_query_secure(search_term text)
RETURNS TABLE(user_id uuid, username text, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Search by username and display name ONLY (phone numbers removed for security)
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
  
  LIMIT 20;
$function$;