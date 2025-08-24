-- Drop the security definer views that are causing warnings
DROP VIEW IF EXISTS public.signal_public_prekeys CASCADE;
DROP VIEW IF EXISTS public.signal_public_one_time_prekeys CASCADE;