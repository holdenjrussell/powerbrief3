-- Fix OneSheet Brand Relation for Demographics Pull
-- This migration ensures the onesheet table has proper foreign key relationship with brands

-- First check if brand_id column exists
DO $$ 
BEGIN
    -- Add brand_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'onesheet' 
        AND column_name = 'brand_id'
    ) THEN
        ALTER TABLE onesheet ADD COLUMN brand_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'onesheet_brand_id_fkey' 
        AND table_name = 'onesheet'
    ) THEN
        ALTER TABLE onesheet 
        ADD CONSTRAINT onesheet_brand_id_fkey 
        FOREIGN KEY (brand_id) 
        REFERENCES brands(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Create index on brand_id for performance
CREATE INDEX IF NOT EXISTS idx_onesheet_brand_id ON onesheet(brand_id);

-- If there are existing onesheets without brand_id, we need to populate them
-- This is a one-time migration to set brand_id based on user's brands
DO $$
DECLARE
    r RECORD;
    user_brand_id UUID;
BEGIN
    -- For each onesheet without a brand_id
    FOR r IN SELECT id, user_id FROM onesheet WHERE brand_id IS NULL
    LOOP
        -- Try to find a brand for this user
        SELECT id INTO user_brand_id 
        FROM brands 
        WHERE user_id = r.user_id 
        LIMIT 1;
        
        -- Update the onesheet with the brand_id if found
        IF user_brand_id IS NOT NULL THEN
            UPDATE onesheet 
            SET brand_id = user_brand_id 
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- Add comment explaining the relationship
COMMENT ON COLUMN onesheet.brand_id IS 'Foreign key to brands table - required for proper brand-based permissions and Meta API access'; 