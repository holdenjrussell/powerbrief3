-- Create contract_signing_tokens table for secure signing links
CREATE TABLE public.contract_signing_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL, -- This can be a UUID or string ID from the recipients JSON
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_contract_signing_tokens_contract_id ON public.contract_signing_tokens(contract_id);
CREATE INDEX idx_contract_signing_tokens_token ON public.contract_signing_tokens(token);
CREATE INDEX idx_contract_signing_tokens_recipient_id ON public.contract_signing_tokens(recipient_id);

-- Enable RLS
ALTER TABLE public.contract_signing_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tokens for their contracts" ON public.contract_signing_tokens
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts
            WHERE contracts.id = contract_signing_tokens.contract_id
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tokens for their contracts" ON public.contract_signing_tokens
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts
            WHERE contracts.id = contract_signing_tokens.contract_id
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tokens for their contracts" ON public.contract_signing_tokens
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts
            WHERE contracts.id = contract_signing_tokens.contract_id
            AND contracts.user_id = auth.uid()
        )
    );

-- Public access for token verification (for signing page)
CREATE POLICY "Public can verify valid tokens" ON public.contract_signing_tokens
    FOR SELECT
    USING (
        expires_at > NOW() 
        AND used_at IS NULL
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at_contract_signing_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contract_signing_tokens_updated_at
    BEFORE UPDATE ON public.contract_signing_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_contract_signing_tokens();
