-- Enable RLS on signal_identity_keys_secure table
ALTER TABLE public.signal_identity_keys_secure ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own identity keys (both public and private)
CREATE POLICY "Users can only view their own identity keys secure" 
ON public.signal_identity_keys_secure 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own identity keys
CREATE POLICY "Users can insert their own identity keys secure" 
ON public.signal_identity_keys_secure 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own identity keys
CREATE POLICY "Users can update their own identity keys secure" 
ON public.signal_identity_keys_secure 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own identity keys
CREATE POLICY "Users can delete their own identity keys secure" 
ON public.signal_identity_keys_secure 
FOR DELETE 
USING (auth.uid() = user_id);