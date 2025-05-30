-- Add missing fields to brief_concepts table
-- This migration adds all the fields that are referenced in the BriefConcept TypeScript interface
-- but are missing from the database schema

-- Add ClickUp integration fields
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS clickup_id TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS clickup_link TEXT DEFAULT NULL;

-- Add team assignment fields
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS strategist TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS creative_coordinator TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS video_editor TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS editor_id TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS custom_editor_name TEXT DEFAULT NULL;

-- Add status and media fields
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT NULL;

-- Add AI and content fields
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS ai_custom_prompt TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS text_hook_options TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS cta_script TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS cta_text_overlay TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add instruction fields
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS videoInstructions TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS designerInstructions TEXT DEFAULT NULL;

-- Add review fields (these might already exist from other migrations, so using IF NOT EXISTS)
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS review_comments TEXT DEFAULT NULL;
ALTER TABLE public.brief_concepts ADD COLUMN IF NOT EXISTS brief_revision_comments TEXT DEFAULT NULL;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS brief_concepts_status_idx ON public.brief_concepts(status);
CREATE INDEX IF NOT EXISTS brief_concepts_strategist_idx ON public.brief_concepts(strategist);
CREATE INDEX IF NOT EXISTS brief_concepts_video_editor_idx ON public.brief_concepts(video_editor);
CREATE INDEX IF NOT EXISTS brief_concepts_media_type_idx ON public.brief_concepts(media_type);

-- Add comments for documentation
COMMENT ON COLUMN public.brief_concepts.clickup_id IS 'ClickUp task ID for project management integration';
COMMENT ON COLUMN public.brief_concepts.clickup_link IS 'ClickUp task URL for project management integration';
COMMENT ON COLUMN public.brief_concepts.strategist IS 'Assigned strategist for this concept';
COMMENT ON COLUMN public.brief_concepts.creative_coordinator IS 'Assigned creative coordinator for this concept';
COMMENT ON COLUMN public.brief_concepts.video_editor IS 'Assigned video editor for this concept';
COMMENT ON COLUMN public.brief_concepts.status IS 'Current status of the concept in the workflow';
COMMENT ON COLUMN public.brief_concepts.media_type IS 'Type of media for this concept (image/video)';
COMMENT ON COLUMN public.brief_concepts.videoInstructions IS 'Video-specific instructions for this concept';
COMMENT ON COLUMN public.brief_concepts.designerInstructions IS 'Designer-specific instructions for this concept'; 