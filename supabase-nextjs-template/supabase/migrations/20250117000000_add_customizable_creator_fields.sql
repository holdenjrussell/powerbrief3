-- Add customizable creator field configuration
-- This allows brands to customize which fields appear in creator forms and onboarding

-- Creator Field Configuration Table
CREATE TABLE IF NOT EXISTS public.ugc_creator_field_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'url', 'textarea', 'select', 'multiselect', 'checkbox', 'number', 'date')),
  field_label TEXT NOT NULL,
  field_placeholder TEXT,
  field_description TEXT,
  is_required BOOLEAN DEFAULT false,
  is_visible_on_form BOOLEAN DEFAULT true,
  is_visible_in_editor BOOLEAN DEFAULT true,
  is_protected BOOLEAN DEFAULT false, -- Protected fields cannot be deleted or have core properties changed
  display_order INTEGER DEFAULT 0,
  field_options JSONB DEFAULT '[]'::jsonb, -- For select/multiselect fields
  validation_rules JSONB DEFAULT '{}'::jsonb, -- Custom validation rules
  field_group TEXT DEFAULT 'custom', -- Group fields together (basic, contact, social, address, custom)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, field_name)
);

-- Add RLS policies
ALTER TABLE public.ugc_creator_field_configs ENABLE ROW LEVEL SECURITY;

-- Brand owners can manage their field configs
CREATE POLICY "Brand owners can manage creator field configs" 
  ON public.ugc_creator_field_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brands 
      WHERE brands.id = ugc_creator_field_configs.brand_id 
      AND brands.user_id = auth.uid()
    )
  );

-- Public can read active field configs for onboarding forms
CREATE POLICY "Public can read active field configs for onboarding" 
  ON public.ugc_creator_field_configs FOR SELECT
  USING (is_visible_on_form = true);

-- Add trigger for updated_at
CREATE TRIGGER update_ugc_creator_field_configs_updated_at
  BEFORE UPDATE ON public.ugc_creator_field_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default protected fields that every brand should have
-- These fields are essential for the system to work and cannot be removed
INSERT INTO public.ugc_creator_field_configs (brand_id, field_name, field_type, field_label, field_placeholder, is_required, is_visible_on_form, is_visible_in_editor, is_protected, display_order, field_group)
SELECT 
  brands.id as brand_id,
  field_data.field_name,
  field_data.field_type,
  field_data.field_label,
  field_data.field_placeholder,
  field_data.is_required,
  field_data.is_visible_on_form,
  field_data.is_visible_in_editor,
  field_data.is_protected,
  field_data.display_order,
  field_data.field_group
FROM public.brands
CROSS JOIN (
  VALUES 
    -- Core Identity Fields (Protected)
    ('name', 'text', 'Full Name', 'Enter your full name', true, true, true, true, 1, 'basic'),
    ('email', 'email', 'Email Address', 'your@email.com', true, true, true, true, 2, 'basic'),
    ('phone_number', 'phone', 'Phone Number', '+1 (555) 123-4567', false, true, true, true, 3, 'contact'),
    
    -- Address Fields (Protected - needed for shipping)
    ('address_line1', 'text', 'Address Line 1', '123 Main Street', false, true, true, true, 10, 'address'),
    ('address_line2', 'text', 'Address Line 2 (Optional)', 'Apartment, suite, etc.', false, true, true, true, 11, 'address'),
    ('city', 'text', 'City', 'New York', false, true, true, true, 12, 'address'),
    ('state', 'text', 'State/Province', 'NY', false, true, true, true, 13, 'address'),
    ('zip', 'text', 'ZIP/Postal Code', '10001', false, true, true, true, 14, 'address'),
    ('country', 'text', 'Country', 'United States', false, true, true, true, 15, 'address'),
    
    -- Social Media Fields (Customizable)
    ('instagram_handle', 'text', 'Instagram Handle', '@yourusername', false, true, true, false, 20, 'social'),
    ('tiktok_handle', 'text', 'TikTok Handle', '@yourusername', false, true, true, false, 21, 'social'),
    ('portfolio_link', 'url', 'Portfolio/Website Link', 'https://yourportfolio.com', false, true, true, false, 22, 'social'),
    
    -- Creator Details (Customizable)
    ('per_script_fee', 'number', 'Rate per Script (USD)', '150', false, true, true, false, 30, 'business'),
    ('gender', 'select', 'Gender', 'Select gender', false, true, true, false, 31, 'demographics'),
    
    -- Backend Only Fields (Protected - not visible on public form)
    ('status', 'select', 'Creator Status', '', false, false, true, true, 100, 'admin'),
    ('contract_status', 'select', 'Contract Status', '', false, false, true, true, 101, 'admin'),
    ('product_shipped', 'checkbox', 'Product Shipped', '', false, false, true, true, 102, 'admin'),
    ('product_shipment_status', 'select', 'Product Shipment Status', '', false, false, true, true, 103, 'admin'),
    ('tracking_number', 'text', 'Tracking Number', '', false, false, true, true, 104, 'admin'),
    ('contacted_by', 'text', 'Contacted By', '', false, false, true, true, 105, 'admin')
) AS field_data(field_name, field_type, field_label, field_placeholder, is_required, is_visible_on_form, is_visible_in_editor, is_protected, display_order, field_group)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ugc_creator_field_configs 
  WHERE ugc_creator_field_configs.brand_id = brands.id 
  AND ugc_creator_field_configs.field_name = field_data.field_name
);

-- Update gender field with options
UPDATE public.ugc_creator_field_configs 
SET field_options = '["Female", "Male", "Non-binary", "Prefer not to say"]'::jsonb
WHERE field_name = 'gender';

-- Update status fields with options
UPDATE public.ugc_creator_field_configs 
SET field_options = '["New Creator Submission", "Under Review", "Approved", "Contract Sent", "Active", "Inactive", "Rejected"]'::jsonb
WHERE field_name = 'status';

UPDATE public.ugc_creator_field_configs 
SET field_options = '["not signed", "sent", "signed", "expired"]'::jsonb
WHERE field_name = 'contract_status';

UPDATE public.ugc_creator_field_configs 
SET field_options = '["pending", "shipped", "delivered", "returned"]'::jsonb
WHERE field_name = 'product_shipment_status';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ugc_creator_field_configs_brand_id_idx ON public.ugc_creator_field_configs(brand_id);
CREATE INDEX IF NOT EXISTS ugc_creator_field_configs_display_order_idx ON public.ugc_creator_field_configs(brand_id, display_order);
CREATE INDEX IF NOT EXISTS ugc_creator_field_configs_form_visible_idx ON public.ugc_creator_field_configs(brand_id, is_visible_on_form);
CREATE INDEX IF NOT EXISTS ugc_creator_field_configs_group_idx ON public.ugc_creator_field_configs(brand_id, field_group); 