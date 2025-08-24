-- Update the redact_message_content trigger to be more aggressive
-- This will ensure ALL messages with encrypted_content have their plaintext content redacted

DROP TRIGGER IF EXISTS redact_message_content_trigger ON public.messages;
DROP FUNCTION IF EXISTS public.redact_message_content();

CREATE OR REPLACE FUNCTION public.redact_message_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always redact content for encrypted messages (except financial notifications)
  IF NEW.encrypted_content IS NOT NULL AND NEW.encrypted_content != '' THEN
    NEW.content := '[encrypted]';
  END IF;
  
  -- Also redact if message_type suggests it should be encrypted
  IF NEW.message_type != 'financial_notification' AND NEW.encrypted_content IS NOT NULL THEN
    NEW.content := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires on INSERT and UPDATE
CREATE TRIGGER redact_message_content_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.redact_message_content();