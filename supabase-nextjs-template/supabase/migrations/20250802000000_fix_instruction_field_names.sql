-- Fix instruction field name inconsistencies

-- Migrate data from videoinstructions to video_instructions, preserving existing data
UPDATE public.brief_concepts
SET video_instructions = videoInstructions
WHERE videoInstructions IS NOT NULL AND (video_instructions IS NULL OR video_instructions = '');

-- Migrate data from designerinstructions to designer_instructions, preserving existing data
UPDATE public.brief_concepts
SET designer_instructions = designerInstructions
WHERE designerInstructions IS NOT NULL AND (designer_instructions IS NULL OR designer_instructions = '');

-- Add comment to mark resolution approach in code
COMMENT ON COLUMN public.brief_concepts.videoInstructions IS 'Legacy column - use video_instructions instead';
COMMENT ON COLUMN public.brief_concepts.designerInstructions IS 'Legacy column - use designer_instructions instead'; 