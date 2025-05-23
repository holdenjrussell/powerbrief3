-- Add creative_strategist field to ugc_creator_scripts table
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS creative_strategist TEXT;

-- Add comment for the field
COMMENT ON COLUMN public.ugc_creator_scripts.creative_strategist IS 'Name of the creative strategist assigned to this script'; 