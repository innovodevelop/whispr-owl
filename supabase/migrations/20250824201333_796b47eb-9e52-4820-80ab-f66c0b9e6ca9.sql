-- Update the message encryption trigger to encrypt ALL messages including financial notifications
CREATE OR REPLACE FUNCTION public.enforce_messages_encrypted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Require encrypted_content for ALL messages (including financial notifications)
  IF NEW.encrypted_content IS NULL OR NEW.encrypted_content = '' THEN
    RAISE EXCEPTION 'All messages must be encrypted. Please check your encryption setup.';
  END IF;
  -- Always redact the plaintext content for encrypted messages
  NEW.content := '[encrypted]';
  
  RETURN NEW;
END;
$function$;