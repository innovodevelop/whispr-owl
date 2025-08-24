-- Fix existing unencrypted messages first, then add enforcement

-- 1) Update all existing non-financial messages that don't have encrypted_content to be redacted
UPDATE public.messages 
SET content = '[encrypted - content unavailable]'
WHERE message_type <> 'financial_notification' 
  AND (encrypted_content IS NULL OR encrypted_content = '')
  AND content <> '[encrypted]'
  AND content <> '[encrypted - content unavailable]';

-- 2) Create enforcement trigger that prevents new unencrypted messages
DROP TRIGGER IF EXISTS trg_enforce_encryption ON public.messages CASCADE;
DROP FUNCTION IF EXISTS public.enforce_messages_encrypted() CASCADE;

CREATE OR REPLACE FUNCTION public.enforce_messages_encrypted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For non-financial messages, require encrypted_content
  IF NEW.message_type <> 'financial_notification' THEN
    IF NEW.encrypted_content IS NULL OR NEW.encrypted_content = '' THEN
      RAISE EXCEPTION 'All messages must be encrypted. Please check your encryption setup.';
    END IF;
    -- Always redact the plaintext content for encrypted messages
    NEW.content := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to new messages only
CREATE TRIGGER trg_enforce_encryption
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_messages_encrypted();