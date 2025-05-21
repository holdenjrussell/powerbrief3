-- Add inspiration video fields to ugc_creator_scripts table
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS inspiration_video_url TEXT,
ADD COLUMN IF NOT EXISTS inspiration_video_notes TEXT;

-- Update types in TypeScript if needed
COMMENT ON COLUMN public.ugc_creator_scripts.inspiration_video_url IS 'URL to an inspiration video for the UGC script';
COMMENT ON COLUMN public.ugc_creator_scripts.inspiration_video_notes IS 'Notes about specific aspects of the inspiration video that are important'; 