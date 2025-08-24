-- Add burn_on_read fields to messages table
ALTER TABLE public.messages 
ADD COLUMN burn_on_read_duration INTEGER DEFAULT NULL,
ADD COLUMN burn_on_read_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of burn_on_read messages
CREATE INDEX idx_messages_burn_on_read ON public.messages(burn_on_read_starts_at) WHERE burn_on_read_starts_at IS NOT NULL;