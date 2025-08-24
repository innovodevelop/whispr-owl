-- Fix the redact_message_content trigger properly
-- First drop existing triggers and function with CASCADE

DROP TRIGGER IF EXISTS trg_redact_message_content ON public.messages CASCADE;
DROP TRIGGER IF EXISTS redact_message_content_trigger ON public.messages CASCADE;
DROP FUNCTION IF EXISTS public.redact_message_content() CASCADE;

-- Create improved function to redact plaintext content when encrypted_content exists
CREATE OR REPLACE FUNCTION public.redact_message_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always redact content for encrypted messages
  IF NEW.encrypted_content IS NOT NULL AND NEW.encrypted_content != '' THEN
    NEW.content := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires on INSERT and UPDATE
CREATE TRIGGER trg_redact_message_content
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.redact_message_content();