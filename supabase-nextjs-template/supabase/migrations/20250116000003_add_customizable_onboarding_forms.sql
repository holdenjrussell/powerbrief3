-- Add customizable onboarding form configuration
-- This allows brands to customize their creator onboarding forms

-- Onboarding Form Configuration Table
CREATE TABLE IF NOT EXISTS public.ugc_onboarding_form_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL DEFAULT 'Creator Application',
  description TEXT,
  welcome_message TEXT,
  success_message TEXT DEFAULT 'Thank you for your application! We will review it and get back to you soon.',
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  auto_assign_status TEXT DEFAULT 'New Creator Submission',
  collect_demographics BOOLEAN DEFAULT true,
  collect_social_handles BOOLEAN DEFAULT true,
  collect_address BOOLEAN DEFAULT true,
  collect_portfolio BOOLEAN DEFAULT true,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb, -- Logo, colors, etc.
  notification_emails TEXT[] DEFAULT '{}', -- Emails to notify on new submissions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, form_name)
);

-- Form Field Options Table - For dropdowns, checkboxes, etc.
CREATE TABLE IF NOT EXISTS public.ugc_form_field_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_config_id UUID NOT NULL REFERENCES public.ugc_onboarding_form_configs(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Public Form Submissions Table (before creator creation)
CREATE TABLE IF NOT EXISTS public.ugc_form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_config_id UUID NOT NULL REFERENCES public.ugc_onboarding_form_configs(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE SET NULL, -- Set when converted to creator
  submitted_ip TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.ugc_onboarding_form_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_form_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding form configs
CREATE POLICY "Users can view form configs for their brands" 
    ON public.ugc_onboarding_form_configs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_onboarding_form_configs.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "Users can manage form configs for their brands" 
    ON public.ugc_onboarding_form_configs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Public access for active onboarding forms
CREATE POLICY "Anyone can view public active onboarding forms" 
    ON public.ugc_onboarding_form_configs FOR SELECT
    USING (is_public = true AND is_active = true);

-- RLS Policies for form field options
CREATE POLICY "Users can manage form field options for their forms" 
    ON public.ugc_form_field_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_onboarding_form_configs
            JOIN public.brands ON brands.id = ugc_onboarding_form_configs.brand_id
            WHERE ugc_onboarding_form_configs.id = ugc_form_field_options.form_config_id
            AND brands.user_id = auth.uid()
        )
    );

-- Public access for form field options of public forms
CREATE POLICY "Anyone can view field options for public forms" 
    ON public.ugc_form_field_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_onboarding_form_configs
            WHERE ugc_onboarding_form_configs.id = ugc_form_field_options.form_config_id
            AND ugc_onboarding_form_configs.is_public = true
            AND ugc_onboarding_form_configs.is_active = true
        )
    );

-- RLS Policies for form submissions
CREATE POLICY "Anyone can submit to public forms" 
    ON public.ugc_form_submissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ugc_onboarding_form_configs
            WHERE ugc_onboarding_form_configs.id = form_config_id
            AND ugc_onboarding_form_configs.is_public = true
            AND ugc_onboarding_form_configs.is_active = true
        )
    );

CREATE POLICY "Users can view submissions for their forms" 
    ON public.ugc_form_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_onboarding_form_configs
            JOIN public.brands ON brands.id = ugc_onboarding_form_configs.brand_id
            WHERE ugc_onboarding_form_configs.id = ugc_form_submissions.form_config_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "Users can update submissions for their forms" 
    ON public.ugc_form_submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_onboarding_form_configs
            JOIN public.brands ON brands.id = ugc_onboarding_form_configs.brand_id
            WHERE ugc_onboarding_form_configs.id = ugc_form_submissions.form_config_id
            AND brands.user_id = auth.uid()
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER update_ugc_onboarding_form_configs_updated_at
    BEFORE UPDATE ON public.ugc_onboarding_form_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_form_submissions_updated_at
    BEFORE UPDATE ON public.ugc_form_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create default onboarding form for existing brands
INSERT INTO public.ugc_onboarding_form_configs (
    brand_id, 
    form_name, 
    description,
    welcome_message,
    custom_fields
)
SELECT 
    id,
    'Creator Application',
    'Apply to become a content creator for our brand',
    'Welcome! We are excited to learn more about you and potentially work together.',
    '[
        {
            "name": "portfolio_link",
            "type": "url",
            "label": "Portfolio/Website Link",
            "required": false,
            "placeholder": "https://your-portfolio.com"
        },
        {
            "name": "content_types",
            "type": "checkbox",
            "label": "What type of content do you create?",
            "required": true,
            "options": ["Short Form Video", "Long Form Video", "Photo", "Stories", "Reels", "TikTok", "YouTube"]
        },
        {
            "name": "platforms",
            "type": "checkbox", 
            "label": "Which platforms are you active on?",
            "required": true,
            "options": ["Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn", "Facebook", "Snapchat"]
        },
        {
            "name": "follower_count",
            "type": "select",
            "label": "Approximate follower count",
            "required": false,
            "options": ["Under 1K", "1K-5K", "5K-10K", "10K-50K", "50K-100K", "100K-500K", "500K-1M", "1M+"]
        },
        {
            "name": "why_interested",
            "type": "textarea",
            "label": "Why are you interested in working with our brand?",
            "required": true,
            "placeholder": "Tell us about your interest in our brand and products..."
        }
    ]'::jsonb
FROM public.brands
ON CONFLICT (brand_id, form_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ugc_onboarding_form_configs_brand_id_idx ON public.ugc_onboarding_form_configs(brand_id);
CREATE INDEX IF NOT EXISTS ugc_onboarding_form_configs_is_public_active_idx ON public.ugc_onboarding_form_configs(is_public, is_active);
CREATE INDEX IF NOT EXISTS ugc_form_field_options_form_config_id_idx ON public.ugc_form_field_options(form_config_id);
CREATE INDEX IF NOT EXISTS ugc_form_submissions_form_config_id_idx ON public.ugc_form_submissions(form_config_id);
CREATE INDEX IF NOT EXISTS ugc_form_submissions_brand_id_status_idx ON public.ugc_form_submissions(brand_id, status);
CREATE INDEX IF NOT EXISTS ugc_form_submissions_created_at_idx ON public.ugc_form_submissions(created_at); 