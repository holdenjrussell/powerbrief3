-- Add brief_revision_comments field to brief_concepts table
-- This field will store comments when the status is set to "BRIEF REVISIONS NEEDED"

-- Check for brief_revision_comments column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'brief_revision_comments'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN brief_revision_comments TEXT DEFAULT NULL;
    END IF;
END $$;

-- Create index for faster queries on brief_revision_comments
CREATE INDEX IF NOT EXISTS brief_concepts_brief_revision_comments_idx ON brief_concepts(brief_revision_comments);

-- Add comment to document the field
COMMENT ON COLUMN public.brief_concepts.brief_revision_comments IS 'Comments explaining what revisions are needed when status is BRIEF REVISIONS NEEDED'; 