-- Add videoInstructions and designerInstructions columns to brief_concepts table
ALTER TABLE public.brief_concepts
ADD COLUMN IF NOT EXISTS videoInstructions TEXT,
ADD COLUMN IF NOT EXISTS designerInstructions TEXT; 