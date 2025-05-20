-- Add description field to brief_concepts table
ALTER TABLE public.brief_concepts
ADD COLUMN IF NOT EXISTS description TEXT; 