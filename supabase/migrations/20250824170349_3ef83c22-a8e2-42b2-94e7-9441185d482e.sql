-- 1) Create trigger function to redact plaintext content when encrypted content is present
CREATE OR REPLACE FUNCTION public.redact_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only redact for non-financial messages that carry encrypted payloads
  IF NEW.message_type <> 'financial_notification' AND NEW.encrypted_content IS NOT NULL THEN
    NEW.content := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Attach trigger to messages table for inserts and updates
DROP TRIGGER IF EXISTS trg_redact_message_content ON public.messages;
CREATE TRIGGER trg_redact_message_content
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.redact_message_content();

-- 3) Redact existing rows that are already encrypted but still store plaintext
UPDATE public.messages
SET content = '[encrypted]'
WHERE message_type <> 'financial_notification'
  AND encrypted_content IS NOT NULL
  AND content IS DISTINCT FROM '[encrypted]';

-- 4) Cleanup expired messages
SELECT public.cleanup_expired_messages();