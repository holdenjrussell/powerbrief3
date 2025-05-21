-- Create PowerBrief initial schema
-- This migration creates the necessary base tables for the PowerBrief feature

-- Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand_info_data JSONB DEFAULT '{}'::jsonb,
    target_audience_data JSONB DEFAULT '{}'::jsonb,
    competition_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create brief_batches table
CREATE TABLE IF NOT EXISTS public.brief_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create brief_concepts table
CREATE TABLE IF NOT EXISTS public.brief_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_batch_id UUID NOT NULL REFERENCES public.brief_batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_title TEXT DEFAULT 'New Concept',
    body_content_structured JSONB DEFAULT '[]'::jsonb,
    order_in_batch INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create or replace update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at column automatically
DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_brief_batches_updated_at ON public.brief_batches;
CREATE TRIGGER update_brief_batches_updated_at
BEFORE UPDATE ON public.brief_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_brief_concepts_updated_at ON public.brief_concepts;
CREATE TRIGGER update_brief_concepts_updated_at
BEFORE UPDATE ON public.brief_concepts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies for brands table
CREATE POLICY "Users can view their own brands" 
    ON public.brands FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brands" 
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for brief_batches table
CREATE POLICY "Users can view their own brief batches" 
    ON public.brief_batches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brief batches" 
    ON public.brief_batches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brief batches" 
    ON public.brief_batches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brief batches" 
    ON public.brief_batches FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for brief_concepts table
CREATE POLICY "Users can view their own brief concepts" 
    ON public.brief_concepts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brief concepts" 
    ON public.brief_concepts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brief concepts" 
    ON public.brief_concepts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brief concepts" 
    ON public.brief_concepts FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS brands_user_id_idx ON public.brands(user_id);
CREATE INDEX IF NOT EXISTS brief_batches_brand_id_idx ON public.brief_batches(brand_id);
CREATE INDEX IF NOT EXISTS brief_batches_user_id_idx ON public.brief_batches(user_id);
CREATE INDEX IF NOT EXISTS brief_concepts_batch_id_idx ON public.brief_concepts(brief_batch_id);
CREATE INDEX IF NOT EXISTS brief_concepts_user_id_idx ON public.brief_concepts(user_id); 