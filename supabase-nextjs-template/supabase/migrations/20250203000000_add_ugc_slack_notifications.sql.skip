-- Add UGC Slack channel configuration to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS ugc_slack_channel TEXT,
ADD COLUMN IF NOT EXISTS ugc_slack_notifications_enabled BOOLEAN DEFAULT true;

-- Add revision tracking to scripts
ALTER TABLE ugc_creator_scripts
ADD COLUMN IF NOT EXISTS has_revisions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_revision_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_resubmitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_content_revision_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN brands.ugc_slack_channel IS 'Slack channel for UGC pipeline notifications (without # prefix)';
COMMENT ON COLUMN brands.ugc_slack_notifications_enabled IS 'Whether to send UGC pipeline notifications to Slack';
COMMENT ON COLUMN ugc_creator_scripts.has_revisions IS 'Whether this script has had revisions requested';
COMMENT ON COLUMN ugc_creator_scripts.revision_count IS 'Number of times revisions have been requested';
COMMENT ON COLUMN ugc_creator_scripts.last_revision_at IS 'Timestamp of last revision submission';
COMMENT ON COLUMN ugc_creator_scripts.content_resubmitted IS 'Whether content has been resubmitted after revision request';
COMMENT ON COLUMN ugc_creator_scripts.content_revision_count IS 'Number of times content revisions have been requested';
COMMENT ON COLUMN ugc_creator_scripts.last_content_revision_at IS 'Timestamp of last content revision submission';