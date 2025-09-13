-- Migration support tables for legacy user migration
CREATE TABLE public.user_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_user_id uuid NOT NULL,
  new_crypto_user_id uuid,
  migration_status text DEFAULT 'pending' CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  backup_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Temporary bridge table during migration
CREATE TABLE public.legacy_crypto_bridge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_user_id uuid NOT NULL,
  crypto_user_id uuid,
  migration_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on migration tables
ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_crypto_bridge ENABLE ROW LEVEL SECURITY;

-- RLS policies for migration tables
CREATE POLICY "Users can manage their own migration"
ON public.user_migrations
FOR ALL
USING (auth.uid() = legacy_user_id)
WITH CHECK (auth.uid() = legacy_user_id);

CREATE POLICY "Users can manage their own bridge data"
ON public.legacy_crypto_bridge
FOR ALL
USING (auth.uid() = legacy_user_id)
WITH CHECK (auth.uid() = legacy_user_id);

-- Add display_name to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text;

-- Create updated_at trigger for migration tables
CREATE TRIGGER update_user_migrations_updated_at
  BEFORE UPDATE ON public.user_migrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();