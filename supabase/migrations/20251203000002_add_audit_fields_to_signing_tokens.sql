-- Add audit fields to contract_signing_tokens table
ALTER TABLE public.contract_signing_tokens 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add index for IP address for potential audit queries
CREATE INDEX IF NOT EXISTS idx_contract_signing_tokens_ip_address 
    ON public.contract_signing_tokens(ip_address); 