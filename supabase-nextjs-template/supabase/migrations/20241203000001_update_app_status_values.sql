-- Migration to update app_status values from old system to new simplified system
-- Old values: 'READY_FOR_LAUNCH' | 'LAUNCHING' | 'LAUNCHED' | 'FAILED_LAUNCH' | 'BACKLOG'
-- New values: 'DRAFT' | 'UPLOADING' | 'PUBLISHED' | 'ERROR'

-- Update existing app_status values to new simplified system
UPDATE public.ad_drafts 
SET app_status = CASE 
    WHEN app_status = 'READY_FOR_LAUNCH' THEN 'DRAFT'
    WHEN app_status = 'LAUNCHING' THEN 'UPLOADING'
    WHEN app_status = 'LAUNCHED' THEN 'PUBLISHED'
    WHEN app_status = 'FAILED_LAUNCH' THEN 'ERROR'
    WHEN app_status = 'BACKLOG' THEN 'DRAFT'
    -- Keep existing new values if they already exist
    WHEN app_status IN ('DRAFT', 'UPLOADING', 'PUBLISHED', 'ERROR') THEN app_status
    -- Default any other unknown values to DRAFT
    ELSE 'DRAFT'
END
WHERE app_status IS NOT NULL;

-- Set default value for any NULL app_status records
UPDATE public.ad_drafts 
SET app_status = 'DRAFT' 
WHERE app_status IS NULL;

-- Add a comment documenting the valid values
COMMENT ON COLUMN public.ad_drafts.app_status IS 'Meta upload status: DRAFT, UPLOADING, PUBLISHED, ERROR'; 