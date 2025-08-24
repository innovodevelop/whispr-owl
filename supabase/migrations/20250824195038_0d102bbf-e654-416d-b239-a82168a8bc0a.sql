-- Enforce encryption for non-financial messages and redact existing plaintext

-- 1) Create/replace enforcement trigger to require encrypted_content for non-financial messages
DROP TRIGGER IF EXISTS trg_enforce_encryption ON public.messages CASCADE;
DROP FUNCTION IF EXISTS public.enforce_messages_encrypted() CASCADE;

CREATE OR REPLACE FUNCTION public.enforce_messages_encrypted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.message_type <> 'financial_notification' AND (NEW.encrypted_content IS NULL OR NEW.encrypted_content = '') THEN
    RAISE EXCEPTION 'Encrypted content required for non-financial messages';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_encryption
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_messages_encrypted();

-- 2) Redact existing plaintext in DB for non-financial messages
UPDATE public.messages
SET content = '[encrypted]'
WHERE message_type <> 'financial_notification'
  AND content IS NOT NULL
  AND content <> '[encrypted]';