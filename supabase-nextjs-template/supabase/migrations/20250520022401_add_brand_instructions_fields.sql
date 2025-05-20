-- Add default_video_instructions and default_designer_instructions columns to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS default_video_instructions TEXT,
ADD COLUMN IF NOT EXISTS default_designer_instructions TEXT;

-- Ensure brief_concepts table has videoInstructions and designerInstructions
ALTER TABLE brief_concepts
ADD COLUMN IF NOT EXISTS "videoInstructions" TEXT,
ADD COLUMN IF NOT EXISTS "designerInstructions" TEXT,
ADD COLUMN IF NOT EXISTS "clickup_link" TEXT;
