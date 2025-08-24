-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM messages 
  WHERE expires_at IS NOT NULL 
    AND expires_at <= now();
END;
$function$;