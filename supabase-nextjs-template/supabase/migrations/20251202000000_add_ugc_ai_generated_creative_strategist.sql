-- Add is_ai_generated and creative_strategist fields to ugc_creator_scripts
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creative_strategist TEXT;

-- Create index for faster filtering on is_ai_generated
CREATE INDEX IF NOT EXISTS ugc_creator_scripts_is_ai_generated_idx ON public.ugc_creator_scripts(is_ai_generated); 