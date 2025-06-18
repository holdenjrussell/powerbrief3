-- Drop onesheet table if it exists (to fix any issues with duplicate creation)
DROP TABLE IF EXISTS public.onesheet CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_onesheet_updated_at() CASCADE;

-- Create onesheet table for Brand OneSheet Creative Strategy Template
CREATE TABLE public.onesheet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    product TEXT,
    landing_page_url TEXT,
    customer_reviews_url TEXT,
    prompt_cheatsheet_url TEXT,
    
    -- Section One: Audience Research
    research_checklist JSONB DEFAULT '{}',
    angles JSONB DEFAULT '[]',
    audience_insights JSONB DEFAULT '{}',
    personas JSONB DEFAULT '[]',
    
    -- Section Two: Competitor Research
    competitor_analysis JSONB DEFAULT '[]',
    competitive_notes TEXT,
    
    -- Section Three: Ad Account Audit  
    ad_account_data JSONB DEFAULT '{}',
    key_learnings JSONB DEFAULT '{}',
    
    -- Section Four: Creative Brainstorm
    concepts JSONB DEFAULT '[]',
    hooks JSONB DEFAULT '[]',
    visuals JSONB DEFAULT '[]',
    
    -- AI Features Data
    ai_research_data JSONB DEFAULT '{}',
    ai_competitor_data JSONB DEFAULT '{}',
    ai_analysis_results JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_onesheet_brand_id ON public.onesheet(brand_id);
CREATE INDEX idx_onesheet_user_id ON public.onesheet(user_id);
CREATE INDEX idx_onesheet_updated_at ON public.onesheet(updated_at);

-- Enable RLS
ALTER TABLE public.onesheet ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view onesheet for brands they own" ON public.onesheet
FOR SELECT USING (
    brand_id IN (
        SELECT id FROM public.brands 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can view onesheet for shared brands" ON public.onesheet
FOR SELECT USING (
    brand_id IN (
        SELECT brand_id FROM public.brand_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can create onesheet for brands they own" ON public.onesheet
FOR INSERT WITH CHECK (
    brand_id IN (
        SELECT id FROM public.brands 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create onesheet for shared brands" ON public.onesheet
FOR INSERT WITH CHECK (
    brand_id IN (
        SELECT brand_id FROM public.brand_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can update onesheet for brands they own" ON public.onesheet
FOR UPDATE USING (
    brand_id IN (
        SELECT id FROM public.brands 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update onesheet for shared brands" ON public.onesheet
FOR UPDATE USING (
    brand_id IN (
        SELECT brand_id FROM public.brand_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can delete onesheet for brands they own" ON public.onesheet
FOR DELETE USING (
    brand_id IN (
        SELECT id FROM public.brands 
        WHERE user_id = auth.uid()
    )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onesheet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onesheet_updated_at_trigger
    BEFORE UPDATE ON public.onesheet
    FOR EACH ROW
    EXECUTE FUNCTION update_onesheet_updated_at();

-- Add comment to table
COMMENT ON TABLE public.onesheet IS 'Stores Creative Strategy OneSheet data for brands including audience research, competitor analysis, ad account audit data, and creative brainstorming'; 