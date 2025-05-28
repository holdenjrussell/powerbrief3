-- Add Creative Coordinator field to PowerBrief concepts
-- This migration adds support for tracking creative coordinators on concepts
-- The new status "READY FOR EDITOR ASSIGNMENT" is handled in the application layer

-- Add creative_coordinator field to brief_concepts table
ALTER TABLE public.brief_concepts 
ADD COLUMN IF NOT EXISTS creative_coordinator TEXT;

-- Create index for faster queries on creative_coordinator
CREATE INDEX IF NOT EXISTS brief_concepts_creative_coordinator_idx ON public.brief_concepts(creative_coordinator);

-- Add comment for documentation
COMMENT ON COLUMN public.brief_concepts.creative_coordinator IS 'Name of the creative coordinator assigned to this concept'; 