-- Create concept_comments table for frame.io style time-coded comments
CREATE TABLE IF NOT EXISTS public.concept_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES public.brief_concepts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.concept_comments(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_email TEXT,
    timestamp_seconds NUMERIC(10,3) NOT NULL, -- Video timestamp in seconds with millisecond precision
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS concept_comments_concept_id_idx ON public.concept_comments(concept_id);
CREATE INDEX IF NOT EXISTS concept_comments_parent_id_idx ON public.concept_comments(parent_id);
CREATE INDEX IF NOT EXISTS concept_comments_timestamp_idx ON public.concept_comments(timestamp_seconds);
CREATE INDEX IF NOT EXISTS concept_comments_created_at_idx ON public.concept_comments(created_at);

-- Add RLS policies
ALTER TABLE public.concept_comments ENABLE ROW LEVEL SECURITY;

-- Allow users to view comments on concepts they have access to
-- This includes both their own concepts and concepts shared with them
CREATE POLICY "Users can view comments on accessible concepts" 
    ON public.concept_comments FOR SELECT
    USING (
        -- User owns the concept
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc 
            WHERE bc.id = concept_comments.concept_id 
            AND bc.user_id = auth.uid()
        )
        OR
        -- Concept is shared publicly (has share_settings)
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc 
            WHERE bc.id = concept_comments.concept_id 
            AND bc.share_settings IS NOT NULL
        )
        OR
        -- Concept is in a batch that's shared publicly
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc
            JOIN public.brief_batches bb ON bc.brief_batch_id = bb.id
            WHERE bc.id = concept_comments.concept_id 
            AND bb.share_settings IS NOT NULL
        )
    );

-- Allow users to insert comments on accessible concepts
CREATE POLICY "Users can insert comments on accessible concepts" 
    ON public.concept_comments FOR INSERT
    WITH CHECK (
        -- User owns the concept
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc 
            WHERE bc.id = concept_comments.concept_id 
            AND bc.user_id = auth.uid()
        )
        OR
        -- Concept is shared publicly (has share_settings)
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc 
            WHERE bc.id = concept_comments.concept_id 
            AND bc.share_settings IS NOT NULL
        )
        OR
        -- Concept is in a batch that's shared publicly
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc
            JOIN public.brief_batches bb ON bc.brief_batch_id = bb.id
            WHERE bc.id = concept_comments.concept_id 
            AND bb.share_settings IS NOT NULL
        )
    );

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" 
    ON public.concept_comments FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" 
    ON public.concept_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_concept_comments_updated_at
    BEFORE UPDATE ON public.concept_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to document the table
COMMENT ON TABLE public.concept_comments IS 'Time-coded comments for video concepts, similar to Frame.io commenting';
COMMENT ON COLUMN public.concept_comments.timestamp_seconds IS 'Video timestamp in seconds where the comment was made';
COMMENT ON COLUMN public.concept_comments.author_name IS 'Display name of the comment author';
COMMENT ON COLUMN public.concept_comments.author_email IS 'Email of the comment author (for identification)'; 