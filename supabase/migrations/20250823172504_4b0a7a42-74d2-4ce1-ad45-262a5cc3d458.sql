-- Security Hardening Migration
-- Fix 1: Remove duplicate RLS policy on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Fix 2: Update database functions to include security definer search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_username(search_term text)
RETURNS TABLE(user_id uuid, username text, display_name text)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $function$
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
$function$;