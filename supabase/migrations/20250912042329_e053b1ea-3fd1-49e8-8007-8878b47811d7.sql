-- Add device management columns to crypto_devices table
ALTER TABLE public.crypto_devices 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_ip inet,
ADD COLUMN IF NOT EXISTS location_permission boolean DEFAULT false;

-- Create device_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.crypto_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  location_encrypted text,
  location_updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true
);

-- Create device_locations table for encrypted location history
CREATE TABLE IF NOT EXISTS public.device_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.crypto_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  encrypted_coordinates text NOT NULL,
  encryption_key_id text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days')
);

-- Create auto_display_names table for automatic display name changes
CREATE TABLE IF NOT EXISTS public.auto_display_names (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  interval_type text NOT NULL DEFAULT 'daily', -- hourly, daily, weekly
  last_rotation timestamp with time zone,
  next_rotation timestamp with time zone,
  name_pool jsonb,
  current_name_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_display_names ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_sessions
CREATE POLICY "Users can manage their own device sessions"
ON public.device_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for device_locations
CREATE POLICY "Users can manage their own device locations"
ON public.device_locations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for auto_display_names
CREATE POLICY "Users can manage their own auto display name settings"
ON public.auto_display_names
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_device ON public.device_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON public.device_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_locations_user_device ON public.device_locations(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_device_locations_timestamp ON public.device_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_auto_display_names_user ON public.auto_display_names(user_id);

-- Function to cleanup expired location data
CREATE OR REPLACE FUNCTION public.cleanup_expired_device_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove expired device sessions
  DELETE FROM public.device_sessions 
  WHERE expires_at <= now();
  
  -- Remove expired location data
  DELETE FROM public.device_locations 
  WHERE expires_at <= now();
END;
$function$;