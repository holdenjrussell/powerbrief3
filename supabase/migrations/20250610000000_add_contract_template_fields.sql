-- Create contract_template_fields table for template field positions
CREATE TABLE IF NOT EXISTS public.contract_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('signature', 'date', 'text', 'checkbox', 'initial', 'email', 'number', 'name')),
    page INTEGER NOT NULL,
    position_x DECIMAL(10,6) NOT NULL,
    position_y DECIMAL(10,6) NOT NULL,
    width DECIMAL(10,6) NOT NULL,
    height DECIMAL(10,6) NOT NULL,
    recipient_role TEXT DEFAULT 'signer' CHECK (recipient_role IN ('signer', 'cc', 'viewer')),
    is_required BOOLEAN DEFAULT true,
    placeholder TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_contract_template_fields_template_id ON public.contract_template_fields(template_id);
CREATE INDEX idx_contract_template_fields_type ON public.contract_template_fields(type);
CREATE INDEX idx_contract_template_fields_page ON public.contract_template_fields(page);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_contract_template_fields_updated_at ON public.contract_template_fields;
CREATE TRIGGER update_contract_template_fields_updated_at
BEFORE UPDATE ON public.contract_template_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.contract_template_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view template fields for their templates" 
    ON public.contract_template_fields FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contract_templates 
            WHERE contract_templates.id = contract_template_fields.template_id 
            AND contract_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert template fields for their templates" 
    ON public.contract_template_fields FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contract_templates 
            WHERE contract_templates.id = contract_template_fields.template_id 
            AND contract_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update template fields for their templates" 
    ON public.contract_template_fields FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contract_templates 
            WHERE contract_templates.id = contract_template_fields.template_id 
            AND contract_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete template fields for their templates" 
    ON public.contract_template_fields FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.contract_templates 
            WHERE contract_templates.id = contract_template_fields.template_id 
            AND contract_templates.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.contract_template_fields TO authenticated;

-- Add comment
COMMENT ON TABLE public.contract_template_fields IS 'Template field positions and types for contract templates'; 