-- Create UGC Creator Pipeline tables
-- This migration creates the necessary tables for the UGC Creator Pipeline feature

-- Create ugc_creators table
CREATE TABLE IF NOT EXISTS public.ugc_creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT,
    status TEXT DEFAULT 'Active',
    products JSONB DEFAULT '[]'::jsonb,
    content_types JSONB DEFAULT '[]'::jsonb,
    contract_status TEXT DEFAULT 'not signed',
    portfolio_link TEXT,
    per_script_fee DECIMAL(10, 2),
    email TEXT,
    phone_number TEXT,
    instagram_handle TEXT,
    tiktok_handle TEXT,
    platforms JSONB DEFAULT '[]'::jsonb,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    contacted_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create ugc_creator_scripts table
CREATE TABLE IF NOT EXISTS public.ugc_creator_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    script_content JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'NEW CREATOR SUBMISSION',
    b_roll_shot_list JSONB DEFAULT '[]'::jsonb,
    ai_custom_prompt TEXT,
    system_instructions TEXT,
    hook_type TEXT DEFAULT 'verbal',
    hook_count INTEGER DEFAULT 1,
    final_content_link TEXT,
    linked_brief_concept_id UUID REFERENCES public.brief_concepts(id) ON DELETE SET NULL,
    linked_brief_batch_id UUID REFERENCES public.brief_batches(id) ON DELETE SET NULL,
    original_creator_script TEXT,
    creator_footage TEXT,
    public_share_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add triggers to update updated_at column automatically
DROP TRIGGER IF EXISTS update_ugc_creators_updated_at ON public.ugc_creators;
CREATE TRIGGER update_ugc_creators_updated_at
BEFORE UPDATE ON public.ugc_creators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ugc_creator_scripts_updated_at ON public.ugc_creator_scripts;
CREATE TRIGGER update_ugc_creator_scripts_updated_at
BEFORE UPDATE ON public.ugc_creator_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies for the ugc_creators table
ALTER TABLE public.ugc_creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ugc creators" 
    ON public.ugc_creators FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ugc creators" 
    ON public.ugc_creators FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ugc creators" 
    ON public.ugc_creators FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ugc creators" 
    ON public.ugc_creators FOR DELETE
    USING (auth.uid() = user_id);

-- Add RLS policies for the ugc_creator_scripts table
ALTER TABLE public.ugc_creator_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ugc creator scripts" 
    ON public.ugc_creator_scripts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ugc creator scripts" 
    ON public.ugc_creator_scripts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ugc creator scripts" 
    ON public.ugc_creator_scripts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ugc creator scripts" 
    ON public.ugc_creator_scripts FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS ugc_creators_user_id_idx ON public.ugc_creators(user_id);
CREATE INDEX IF NOT EXISTS ugc_creators_brand_id_idx ON public.ugc_creators(brand_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_creator_id_idx ON public.ugc_creator_scripts(creator_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_user_id_idx ON public.ugc_creator_scripts(user_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_brand_id_idx ON public.ugc_creator_scripts(brand_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_linked_concept_idx ON public.ugc_creator_scripts(linked_brief_concept_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_linked_batch_idx ON public.ugc_creator_scripts(linked_brief_batch_id);
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_public_share_id_idx ON public.ugc_creator_scripts(public_share_id);

-- Add columns to brief_concepts table to link with UGC creators
ALTER TABLE public.brief_concepts 
ADD COLUMN IF NOT EXISTS linked_creator_ids UUID[] DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS original_creator_script TEXT,
ADD COLUMN IF NOT EXISTS creator_footage TEXT; 