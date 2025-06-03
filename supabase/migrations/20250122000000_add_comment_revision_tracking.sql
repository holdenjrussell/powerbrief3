-- Add revision tracking to concept_comments table
ALTER TABLE public.concept_comments 
ADD COLUMN revision_version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN resolved_at TIMESTAMPTZ,
ADD COLUMN resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add revision counter to brief_concepts table
ALTER TABLE public.brief_concepts 
ADD COLUMN revision_count INTEGER DEFAULT 1 NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS concept_comments_revision_version_idx ON public.concept_comments(revision_version);
CREATE INDEX IF NOT EXISTS concept_comments_is_resolved_idx ON public.concept_comments(is_resolved);
CREATE INDEX IF NOT EXISTS brief_concepts_revision_count_idx ON public.brief_concepts(revision_count);

-- Add comments to document the new fields
COMMENT ON COLUMN public.concept_comments.revision_version IS 'Version number of the concept when this comment was made';
COMMENT ON COLUMN public.concept_comments.is_resolved IS 'Whether this comment has been marked as resolved';
COMMENT ON COLUMN public.concept_comments.resolved_at IS 'When this comment was marked as resolved';
COMMENT ON COLUMN public.concept_comments.resolved_by IS 'User who marked this comment as resolved';
COMMENT ON COLUMN public.brief_concepts.revision_count IS 'Number of times this concept has been revised/resubmitted';

-- Create a function to handle revision tracking
CREATE OR REPLACE FUNCTION handle_concept_revision()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the concept is being resubmitted (changing from needs_revisions to ready_for_review)
    IF OLD.review_status IN ('needs_revisions', 'needs_additional_sizes') 
       AND NEW.review_status = 'ready_for_review' THEN
        -- Increment the revision count
        NEW.revision_count = COALESCE(OLD.revision_count, 1) + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER concept_revision_trigger
    BEFORE UPDATE ON public.brief_concepts
    FOR EACH ROW
    EXECUTE FUNCTION handle_concept_revision();

-- Update RLS policies to allow resolving comments for concept owners and admins
CREATE POLICY "Users can resolve comments on their concepts" 
    ON public.concept_comments FOR UPDATE
    USING (
        -- User owns the concept
        EXISTS (
            SELECT 1 FROM public.brief_concepts bc 
            WHERE bc.id = concept_comments.concept_id 
            AND bc.user_id = auth.uid()
        )
        -- Only allow updating resolution fields, not the comment content itself
        AND (
            NEW.comment_text = OLD.comment_text 
            AND NEW.timestamp_seconds = OLD.timestamp_seconds
            AND NEW.concept_id = OLD.concept_id
            AND NEW.user_id = OLD.user_id
            AND NEW.author_name = OLD.author_name
            AND NEW.author_email = OLD.author_email
            AND NEW.parent_id = OLD.parent_id
            AND NEW.revision_version = OLD.revision_version
        )
    ); 