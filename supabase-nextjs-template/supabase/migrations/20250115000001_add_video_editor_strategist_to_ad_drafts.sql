-- Add video_editor and strategist fields to ad_drafts table
-- This allows the ad upload tool to preserve context from the original PowerBrief concept
-- for use in Gemini AI processing

ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS video_editor TEXT,
ADD COLUMN IF NOT EXISTS strategist TEXT;

-- Add comments documenting these fields
COMMENT ON COLUMN public.ad_drafts.video_editor IS 'Video editor assigned to the original PowerBrief concept';
COMMENT ON COLUMN public.ad_drafts.strategist IS 'Creative strategist assigned to the original PowerBrief concept';

-- Create indexes for potential filtering/searching
CREATE INDEX IF NOT EXISTS ad_drafts_video_editor_idx ON public.ad_drafts(video_editor);
CREATE INDEX IF NOT EXISTS ad_drafts_strategist_idx ON public.ad_drafts(strategist); 