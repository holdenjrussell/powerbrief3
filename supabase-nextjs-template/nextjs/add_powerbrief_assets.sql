-- Add asset storage fields to brief_concepts table
-- This allows PowerBrief concepts to store uploaded creative assets instead of just Frame.io links

-- Check for uploaded_assets column and add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'uploaded_assets'
    ) THEN
        ALTER TABLE brief_concepts 
        ADD COLUMN uploaded_assets JSONB DEFAULT NULL;
    END IF;
END $$;

-- Check for asset_upload_status column and add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'asset_upload_status'
    ) THEN
        ALTER TABLE brief_concepts 
        ADD COLUMN asset_upload_status TEXT DEFAULT NULL;
    END IF;
END $$;

-- Check for selected_ad_batch_id column and add if missing (for connecting to ad uploader)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'selected_ad_batch_id'
    ) THEN
        ALTER TABLE brief_concepts 
        ADD COLUMN selected_ad_batch_id UUID DEFAULT NULL;
    END IF;
END $$;

-- Create index for faster queries on asset_upload_status
CREATE INDEX IF NOT EXISTS brief_concepts_asset_upload_status_idx ON brief_concepts(asset_upload_status);

-- Create index for faster queries on selected_ad_batch_id
CREATE INDEX IF NOT EXISTS brief_concepts_selected_ad_batch_id_idx ON brief_concepts(selected_ad_batch_id);

-- Add foreign key constraint for selected_ad_batch_id if ad_batches table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_batches') THEN
        -- Check if the foreign key constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'brief_concepts_selected_ad_batch_id_fkey'
        ) THEN
            ALTER TABLE brief_concepts 
            ADD CONSTRAINT brief_concepts_selected_ad_batch_id_fkey 
            FOREIGN KEY (selected_ad_batch_id) REFERENCES ad_batches(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Update the uploaded_assets column comment
COMMENT ON COLUMN brief_concepts.uploaded_assets IS 'JSON array of uploaded creative assets with metadata including aspect ratios, file URLs, and grouping information';
COMMENT ON COLUMN brief_concepts.asset_upload_status IS 'Status of asset uploads: pending, uploaded, approved, sent_to_ad_batch';
COMMENT ON COLUMN brief_concepts.selected_ad_batch_id IS 'Reference to ad_batches table when approved assets are sent to ad uploader'; 