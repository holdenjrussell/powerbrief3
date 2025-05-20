-- Add review fields to brief_concepts table if they don't exist

-- Check for review_status column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'review_status'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN review_status TEXT DEFAULT NULL;
    END IF;
END $$;

-- Check for review_link column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'review_link'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN review_link TEXT DEFAULT NULL;
    END IF;
END $$;

-- Check for reviewer_notes column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'reviewer_notes'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN reviewer_notes TEXT DEFAULT NULL;
    END IF;
END $$;

-- Create index for faster queries on review_status
CREATE INDEX IF NOT EXISTS brief_concepts_review_status_idx ON brief_concepts(review_status);

-- Update RLS policies to ensure they cover the new fields
-- This maintains existing permissions 