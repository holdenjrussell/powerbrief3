-- Add Slack Integration fields to brands table
-- Run this in your Supabase SQL Editor

-- Add Slack OAuth and webhook storage columns
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
ADD COLUMN IF NOT EXISTS slack_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS slack_channel_config JSONB DEFAULT '{}';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS brands_slack_notifications_enabled_idx ON public.brands(slack_notifications_enabled);

-- Update existing records to have default channel config
UPDATE public.brands 
SET slack_channel_config = '{
  "default": null,
  "concept_submission": null,
  "concept_revision": null,
  "concept_approval": null,
  "concept_ready_for_editor": null,
  "ad_launch": null
}'::jsonb
WHERE slack_channel_config IS NULL OR slack_channel_config = '{}'::jsonb;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'brands' 
AND table_schema = 'public'
AND column_name LIKE 'slack_%'
ORDER BY column_name; 