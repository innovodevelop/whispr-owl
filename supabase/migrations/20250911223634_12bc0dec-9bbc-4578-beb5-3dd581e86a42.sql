-- Fix rate limiting system RLS policies to allow proper system access
-- while preventing user manipulation

-- Drop the overly restrictive existing policy
DROP POLICY IF EXISTS "Complete system control of rate limits" ON public.rate_limits;

-- Create proper policies for rate limiting system

-- Allow service role (system) to manage all rate limit data
CREATE POLICY "System can manage all rate limits" 
ON public.rate_limits 
FOR ALL 
USING (
  -- Only allow service role access (system-level operations)
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Allow authenticated service operations (edge functions)
  auth.jwt() IS NULL
);

-- Allow users to view their own rate limit status (read-only)
CREATE POLICY "Users can view their own rate limit status" 
ON public.rate_limits 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND user_id IS NOT NULL
);

-- Create a secure function for edge functions to manage rate limits
CREATE OR REPLACE FUNCTION public.upsert_rate_limit(
  p_action_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_attempt_count INTEGER DEFAULT 1,
  p_window_start TIMESTAMPTZ DEFAULT NOW(),
  p_blocked_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rate_limit_id UUID;
BEGIN
  -- Insert or update rate limit record
  INSERT INTO public.rate_limits (
    user_id,
    ip_address,
    action_type,
    attempt_count,
    window_start,
    blocked_until
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_action_type,
    p_attempt_count,
    p_window_start,
    p_blocked_until
  )
  ON CONFLICT (COALESCE(user_id::text, ''), COALESCE(ip_address::text, ''), action_type)
  DO UPDATE SET
    attempt_count = EXCLUDED.attempt_count,
    window_start = EXCLUDED.window_start,
    blocked_until = EXCLUDED.blocked_until,
    created_at = NOW()
  RETURNING id INTO rate_limit_id;
  
  RETURN rate_limit_id;
END;
$$;

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window TIMESTAMPTZ;
  rate_record RECORD;
  result JSONB;
BEGIN
  current_window := NOW() - INTERVAL '1 minute' * p_window_minutes;
  
  -- Get current rate limit record
  SELECT * INTO rate_record
  FROM public.rate_limits
  WHERE (
    (p_user_id IS NOT NULL AND user_id = p_user_id) OR
    (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
  )
  AND action_type = p_action_type
  AND window_start > current_window;
  
  -- If no record or window expired, allow
  IF rate_record IS NULL THEN
    result := jsonb_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - 1,
      'reset_time', NULL,
      'blocked_until', NULL
    );
  -- If currently blocked
  ELSIF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > NOW() THEN
    result := jsonb_build_object(
      'allowed', false,
      'attempts_remaining', 0,
      'reset_time', rate_record.blocked_until,
      'blocked_until', rate_record.blocked_until
    );
  -- If within rate limit
  ELSIF rate_record.attempt_count < p_max_attempts THEN
    result := jsonb_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - rate_record.attempt_count - 1,
      'reset_time', rate_record.window_start + INTERVAL '1 minute' * p_window_minutes,
      'blocked_until', NULL
    );
  -- If rate limit exceeded
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'attempts_remaining', 0,
      'reset_time', rate_record.window_start + INTERVAL '1 minute' * p_window_minutes,
      'blocked_until', rate_record.blocked_until
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Create cleanup function for expired rate limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove rate limits older than 24 hours
  DELETE FROM public.rate_limits 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Remove expired blocks
  DELETE FROM public.rate_limits 
  WHERE blocked_until IS NOT NULL 
    AND blocked_until < NOW();
END;
$$;