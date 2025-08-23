-- Add phone number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number TEXT;

-- Create blocked_users table for privacy & security
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

-- Enable Row Level Security for blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked_users
CREATE POLICY "Users can view their blocked users" 
ON public.blocked_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can block other users" 
ON public.blocked_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unblock users" 
ON public.blocked_users 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add notification_permission column to user_settings for browser notifications
ALTER TABLE public.user_settings 
ADD COLUMN notification_permission TEXT DEFAULT 'default';

-- Add theme preference to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN theme TEXT DEFAULT 'system';