-- Add expires_at column to brand_shares table
-- This column tracks when the invitation expires

ALTER TABLE public.brand_shares 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update existing rows to have an expiration date (7 days from creation)
UPDATE public.brand_shares 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL AND status = 'pending';

-- Add comment
COMMENT ON COLUMN public.brand_shares.expires_at IS 'When the invitation expires (null for accepted shares)'; 