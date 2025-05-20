-- Add share_settings column to brief_concepts and brief_batches tables if not already present

-- Check and add share_settings to brief_concepts table 
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'share_settings'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN share_settings JSONB DEFAULT NULL;
    END IF;
END $$;

-- Check and add share_settings to brief_batches table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_batches' 
        AND column_name = 'share_settings'
    ) THEN
        ALTER TABLE public.brief_batches
        ADD COLUMN share_settings JSONB DEFAULT NULL;
    END IF;
END $$;

-- Create indexes for faster queries if they don't exist
CREATE INDEX IF NOT EXISTS brief_concepts_share_settings_idx ON brief_concepts USING gin(share_settings);
CREATE INDEX IF NOT EXISTS brief_batches_share_settings_idx ON brief_batches USING gin(share_settings); 