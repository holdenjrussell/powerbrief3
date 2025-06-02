-- Add date_assigned field to brief_concepts table
-- This field tracks when a concept was assigned (marked as "READY FOR EDITOR" or "READY FOR DESIGNER")

ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS date_assigned TIMESTAMPTZ DEFAULT NULL;

-- Create index for faster filtering and sorting by date_assigned
CREATE INDEX IF NOT EXISTS brief_concepts_date_assigned_idx ON public.brief_concepts(date_assigned);

-- Add comment for documentation
COMMENT ON COLUMN public.brief_concepts.date_assigned IS 'Timestamp when concept was assigned (status changed to READY FOR EDITOR or READY FOR DESIGNER)'; 