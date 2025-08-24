-- Create RPC functions to handle conversation_settings operations

-- Function to get conversation settings
CREATE OR REPLACE FUNCTION public.get_conversation_settings(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  disappearing_enabled BOOLEAN,
  disappearing_duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.disappearing_enabled,
    cs.disappearing_duration
  FROM public.conversation_settings cs
  WHERE cs.conversation_id = p_conversation_id 
    AND cs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to upsert conversation settings
CREATE OR REPLACE FUNCTION public.upsert_conversation_settings(
  p_conversation_id UUID,
  p_user_id UUID,
  p_disappearing_enabled BOOLEAN,
  p_disappearing_duration INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.conversation_settings (
    conversation_id,
    user_id,
    disappearing_enabled,
    disappearing_duration
  ) VALUES (
    p_conversation_id,
    p_user_id,
    p_disappearing_enabled,
    p_disappearing_duration
  )
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET
    disappearing_enabled = EXCLUDED.disappearing_enabled,
    disappearing_duration = EXCLUDED.disappearing_duration,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;