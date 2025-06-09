-- Create Contract System Tables
-- This migration creates the necessary tables for contract signing functionality

-- Create contract_templates table for reusable templates
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    document_data BYTEA NOT NULL, -- PDF document data
    document_name TEXT NOT NULL,
    document_size INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    fields JSONB DEFAULT '[]'::jsonb, -- Signature field positions and types
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create contracts table for contract instances
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE SET NULL,
    script_id UUID REFERENCES public.ugc_creator_scripts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_signed', 'completed', 'voided')),
    document_data BYTEA NOT NULL,
    document_name TEXT NOT NULL,
    document_size INTEGER NOT NULL,
    signed_document_data BYTEA, -- Final signed PDF
    completion_certificate JSONB, -- Certificate data with audit trail
    share_token TEXT UNIQUE,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create contract_recipients table for signers
CREATE TABLE IF NOT EXISTS public.contract_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'signer' CHECK (role IN ('signer', 'cc', 'viewer')),
    signing_order INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined')),
    signed_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    auth_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create contract_fields table for signature fields
CREATE TABLE IF NOT EXISTS public.contract_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.contract_recipients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('signature', 'date', 'text', 'checkbox', 'initial')),
    page INTEGER NOT NULL,
    position_x DECIMAL(10,6) NOT NULL,
    position_y DECIMAL(10,6) NOT NULL,
    width DECIMAL(10,6) NOT NULL,
    height DECIMAL(10,6) NOT NULL,
    value TEXT, -- Actual signature data/text value
    is_required BOOLEAN DEFAULT true,
    placeholder TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create contract_audit_logs table for tracking actions
CREATE TABLE IF NOT EXISTS public.contract_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.contract_recipients(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'created', 'sent', 'viewed', 'signed', 'declined', 'completed'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_contract_templates_brand_id ON public.contract_templates(brand_id);
CREATE INDEX idx_contract_templates_user_id ON public.contract_templates(user_id);
CREATE INDEX idx_contracts_brand_id ON public.contracts(brand_id);
CREATE INDEX idx_contracts_creator_id ON public.contracts(creator_id);
CREATE INDEX idx_contracts_script_id ON public.contracts(script_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_share_token ON public.contracts(share_token);
CREATE INDEX idx_contract_recipients_contract_id ON public.contract_recipients(contract_id);
CREATE INDEX idx_contract_recipients_email ON public.contract_recipients(email);
CREATE INDEX idx_contract_recipients_auth_token ON public.contract_recipients(auth_token);
CREATE INDEX idx_contract_fields_contract_id ON public.contract_fields(contract_id);
CREATE INDEX idx_contract_fields_recipient_id ON public.contract_fields(recipient_id);
CREATE INDEX idx_contract_audit_logs_contract_id ON public.contract_audit_logs(contract_id);

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_contract_templates_updated_at ON public.contract_templates;
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_recipients_updated_at ON public.contract_recipients;
CREATE TRIGGER update_contract_recipients_updated_at
BEFORE UPDATE ON public.contract_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_fields_updated_at ON public.contract_fields;
CREATE TRIGGER update_contract_fields_updated_at
BEFORE UPDATE ON public.contract_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_audit_logs ENABLE ROW LEVEL SECURITY;

-- Contract Templates RLS
CREATE POLICY "Users can view their own contract templates" 
    ON public.contract_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contract templates" 
    ON public.contract_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contract templates" 
    ON public.contract_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contract templates" 
    ON public.contract_templates FOR DELETE
    USING (auth.uid() = user_id);

-- Contracts RLS
CREATE POLICY "Users can view their own contracts" 
    ON public.contracts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contracts" 
    ON public.contracts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts" 
    ON public.contracts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts" 
    ON public.contracts FOR DELETE
    USING (auth.uid() = user_id);

-- Public access for signed contracts via share_token
CREATE POLICY "Anyone can view contracts with valid share token" 
    ON public.contracts FOR SELECT
    USING (share_token IS NOT NULL);

-- Contract Recipients RLS
CREATE POLICY "Users can view recipients of their contracts" 
    ON public.contract_recipients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_recipients.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recipients for their contracts" 
    ON public.contract_recipients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_recipients.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update recipients of their contracts" 
    ON public.contract_recipients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_recipients.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Public access for recipients via auth_token
CREATE POLICY "Recipients can view and update their own records via auth token" 
    ON public.contract_recipients FOR ALL
    USING (auth_token IS NOT NULL);

-- Contract Fields RLS
CREATE POLICY "Users can manage fields of their contracts" 
    ON public.contract_fields FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_fields.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Public access for fields via contract share token
CREATE POLICY "Anyone can view fields of publicly shared contracts" 
    ON public.contract_fields FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_fields.contract_id 
            AND contracts.share_token IS NOT NULL
        )
    );

-- Contract Audit Logs RLS
CREATE POLICY "Users can view audit logs of their contracts" 
    ON public.contract_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_audit_logs.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert audit logs" 
    ON public.contract_audit_logs FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.contract_templates TO authenticated;
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contract_recipients TO authenticated;
GRANT ALL ON public.contract_fields TO authenticated;
GRANT ALL ON public.contract_audit_logs TO authenticated;

GRANT SELECT ON public.contract_templates TO anon;
GRANT SELECT ON public.contracts TO anon;
GRANT SELECT ON public.contract_recipients TO anon;
GRANT SELECT, UPDATE ON public.contract_fields TO anon;
GRANT INSERT ON public.contract_audit_logs TO anon; 