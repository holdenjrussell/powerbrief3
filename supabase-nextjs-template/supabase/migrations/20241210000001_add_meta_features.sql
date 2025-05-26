-- Migration to add Site Links, Info Labels, and Advantage+ Creative Enhancements
-- These features enhance Meta ad campaigns with additional business information and AI optimizations

-- Add Site Links support to ad_batches (for defaults)
ALTER TABLE public.ad_batches 
ADD COLUMN IF NOT EXISTS site_links JSONB DEFAULT '[]'::jsonb;

-- Add Info Labels support to ad_batches (for defaults)
ALTER TABLE public.ad_batches 
ADD COLUMN IF NOT EXISTS info_labels JSONB DEFAULT '[]'::jsonb;

-- Add Advantage+ Creative Enhancements to ad_batches (for defaults)
ALTER TABLE public.ad_batches 
ADD COLUMN IF NOT EXISTS advantage_plus_creative JSONB DEFAULT '{
  "translate_text": false,
  "add_overlays": false,
  "visual_touch_ups": false,
  "music": false,
  "3d_animation": false,
  "text_improvements": false
}'::jsonb;

-- Add the same fields to ad_drafts for per-ad overrides
ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS site_links JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS info_labels JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.ad_drafts 
ADD COLUMN IF NOT EXISTS advantage_plus_creative JSONB DEFAULT '{
  "translate_text": false,
  "add_overlays": false,
  "visual_touch_ups": false,
  "music": false,
  "3d_animation": false,
  "text_improvements": false
}'::jsonb;

-- Add comments documenting the structure
COMMENT ON COLUMN public.ad_batches.site_links IS 'Array of site link objects: [{url: string, display_label: string, thumbnail_url?: string}]';
COMMENT ON COLUMN public.ad_batches.info_labels IS 'Array of info label objects: [{type: string, enabled: boolean, config: object}]';
COMMENT ON COLUMN public.ad_batches.advantage_plus_creative IS 'Advantage+ creative enhancement settings';

COMMENT ON COLUMN public.ad_drafts.site_links IS 'Array of site link objects: [{url: string, display_label: string, thumbnail_url?: string}]';
COMMENT ON COLUMN public.ad_drafts.info_labels IS 'Array of info label objects: [{type: string, enabled: boolean, config: object}]';
COMMENT ON COLUMN public.ad_drafts.advantage_plus_creative IS 'Advantage+ creative enhancement settings'; 