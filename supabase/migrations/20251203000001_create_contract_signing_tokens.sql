-- Create contract_signing_tokens table for secure signing links
CREATE TABLE IF NOT EXISTS public.contract_signing_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.contract_recipients(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_contract_signing_tokens_contract_id ON public.contract_signing_tokens(contract_id);
CREATE INDEX idx_contract_signing_tokens_token ON public.contract_signing_tokens(token);
CREATE INDEX idx_contract_signing_tokens_recipient_id ON public.contract_signing_tokens(recipient_id);

-- Enable RLS
ALTER TABLE public.contract_signing_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only the contract owner can view tokens
CREATE POLICY "Users can view tokens for their contracts" 
    ON public.contract_signing_tokens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_signing_tokens.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Only the contract owner can create tokens
CREATE POLICY "Users can create tokens for their contracts" 
    ON public.contract_signing_tokens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_signing_tokens.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Public access for token verification
CREATE POLICY "Anyone can verify tokens" 
    ON public.contract_signing_tokens FOR SELECT
    USING (token IS NOT NULL);

-- Grant permissions
GRANT ALL ON public.contract_signing_tokens TO authenticated;
GRANT SELECT, UPDATE ON public.contract_signing_tokens TO anon; 