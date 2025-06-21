-- OneSheet Enhancements for Ad Audit Feature
-- Adds columns and tables needed for the enhanced ad audit functionality

-- Add OneSheet audit columns if they don't exist
DO $$ 
BEGIN
    -- Add ad_account_audit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'ad_account_audit') THEN
        ALTER TABLE onesheet ADD COLUMN ad_account_audit JSONB DEFAULT '{}';
    END IF;

    -- Add stages_completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'stages_completed') THEN
        ALTER TABLE onesheet ADD COLUMN stages_completed JSONB DEFAULT '{
            "context": false,
            "audience_research": false,
            "competitor_research": false,
            "ad_audit": false,
            "creative_brainstorm": false
        }';
    END IF;

    -- Add audience_research column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'audience_research') THEN
        ALTER TABLE onesheet ADD COLUMN audience_research JSONB DEFAULT '{
            "angles": [],
            "benefits": [],
            "painPoints": [],
            "features": [],
            "objections": [],
            "failedSolutions": [],
            "other": [],
            "personas": []
        }';
    END IF;

    -- Add competitor_research column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'competitor_research') THEN
        ALTER TABLE onesheet ADD COLUMN competitor_research JSONB DEFAULT '{
            "competitors": [],
            "deepAnalysis": {
                "qualityComparison": {},
                "formatStrategies": {},
                "creatorApproaches": {},
                "learningsOverTime": []
            }
        }';
    END IF;

    -- Add creative_brainstorm column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'creative_brainstorm') THEN
        ALTER TABLE onesheet ADD COLUMN creative_brainstorm JSONB DEFAULT '{
            "concepts": [],
            "hooks": [],
            "visuals": []
        }';
    END IF;

    -- Add current_stage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'current_stage') THEN
        ALTER TABLE onesheet ADD COLUMN current_stage TEXT DEFAULT 'context_loading';
    END IF;

    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'onesheet' AND column_name = 'name') THEN
        ALTER TABLE onesheet ADD COLUMN name TEXT;
    END IF;
END $$;

-- Create onesheet_ad_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS onesheet_ad_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    onesheet_id UUID NOT NULL REFERENCES onesheet(id) ON DELETE CASCADE,
    ad_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'thumbnail')),
    asset_url TEXT NOT NULL,
    file_path TEXT, -- Path in Supabase storage after download
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(onesheet_id, ad_id, asset_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onesheet_ad_assets_onesheet_id ON onesheet_ad_assets(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_ad_assets_ad_id ON onesheet_ad_assets(ad_id);

-- Enable RLS on the new table
ALTER TABLE onesheet_ad_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for onesheet_ad_assets
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own ad assets" ON onesheet_ad_assets;
    DROP POLICY IF EXISTS "Users can insert their own ad assets" ON onesheet_ad_assets;
    DROP POLICY IF EXISTS "Users can update their own ad assets" ON onesheet_ad_assets;
    DROP POLICY IF EXISTS "Users can delete their own ad assets" ON onesheet_ad_assets;

    -- Create new policies
    CREATE POLICY "Users can view their own ad assets" ON onesheet_ad_assets
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM onesheet
                WHERE onesheet.id = onesheet_ad_assets.onesheet_id
                AND onesheet.user_id = auth.uid()
            )
        );

    CREATE POLICY "Users can insert their own ad assets" ON onesheet_ad_assets
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM onesheet
                WHERE onesheet.id = onesheet_ad_assets.onesheet_id
                AND onesheet.user_id = auth.uid()
            )
        );

    CREATE POLICY "Users can update their own ad assets" ON onesheet_ad_assets
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM onesheet
                WHERE onesheet.id = onesheet_ad_assets.onesheet_id
                AND onesheet.user_id = auth.uid()
            )
        );

    CREATE POLICY "Users can delete their own ad assets" ON onesheet_ad_assets
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 FROM onesheet
                WHERE onesheet.id = onesheet_ad_assets.onesheet_id
                AND onesheet.user_id = auth.uid()
            )
        );
END $$;

-- Create storage bucket for ad assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('onesheet-ad-assets', 'onesheet-ad-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own ad assets in storage" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own ad assets to storage" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own ad assets in storage" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own ad assets from storage" ON storage.objects;

    -- Create new policies for the ad assets bucket
    CREATE POLICY "Users can view their own ad assets in storage" ON storage.objects
        FOR SELECT
        USING (
            bucket_id = 'onesheet-ad-assets' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );

    CREATE POLICY "Users can upload their own ad assets to storage" ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'onesheet-ad-assets' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );

    CREATE POLICY "Users can update their own ad assets in storage" ON storage.objects
        FOR UPDATE
        USING (
            bucket_id = 'onesheet-ad-assets' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );

    CREATE POLICY "Users can delete their own ad assets from storage" ON storage.objects
        FOR DELETE
        USING (
            bucket_id = 'onesheet-ad-assets' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
END $$;

-- Create storage bucket for OneSheet assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onesheet-assets',
  'onesheet-assets',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view OneSheet assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload OneSheet assets for their brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can update OneSheet assets for their brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete OneSheet assets for their brands" ON storage.objects;

-- Create more permissive RLS policies for onesheet-assets bucket
CREATE POLICY "Public read access for OneSheet assets" ON storage.objects
FOR SELECT USING (bucket_id = 'onesheet-assets');

CREATE POLICY "Authenticated users can upload OneSheet assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'onesheet-assets' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update OneSheet assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'onesheet-assets' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete OneSheet assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'onesheet-assets' AND
  auth.uid() IS NOT NULL
);

-- Add name column to onesheet table if it doesn't exist
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add audience research stage columns if they don't exist
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS audience_research JSONB DEFAULT '{
  "angles": [],
  "benefits": [],
  "painPoints": [],
  "features": [],
  "objections": [],
  "failedSolutions": [],
  "other": [],
  "personas": []
}';

-- Add competitor research stage columns if they don't exist
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS competitor_research JSONB DEFAULT '{
  "competitors": [],
  "deepAnalysis": {
    "qualityComparison": {},
    "formatStrategies": {},
    "creatorApproaches": {},
    "learningsOverTime": []
  }
}';

-- Add enhanced ad account audit columns if they don't exist
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS ad_account_audit JSONB DEFAULT '{
  "ads": [],
  "demographicBreakdown": {
    "age": {},
    "gender": {},
    "placement": {}
  },
  "performanceByAngle": {},
  "performanceByFormat": {},
  "performanceByEmotion": {},
  "performanceByFramework": {}
}';

-- Add creative brainstorm stage columns if they don't exist
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS creative_brainstorm JSONB DEFAULT '{
  "concepts": [],
  "hooks": [],
  "visuals": []
}';

-- Add stage tracking columns if they don't exist
ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'context_loading';

ALTER TABLE onesheet
ADD COLUMN IF NOT EXISTS stages_completed JSONB DEFAULT '{
  "context": false,
  "audience_research": false,
  "competitor_research": false,
  "ad_audit": false,
  "creative_brainstorm": false
}';

-- Create onesheet_ad_assets table for tracking downloaded assets
CREATE TABLE IF NOT EXISTS onesheet_ad_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onesheet_id UUID NOT NULL REFERENCES onesheet(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('video', 'image')),
  original_url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(onesheet_id, ad_id, asset_id)
);

-- Add RLS policies for onesheet_ad_assets
ALTER TABLE onesheet_ad_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their OneSheet ad assets" ON onesheet_ad_assets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM onesheet o
    JOIN brands b ON b.id = o.brand_id
    WHERE o.id = onesheet_ad_assets.onesheet_id
    AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert OneSheet ad assets for their brands" ON onesheet_ad_assets
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM onesheet o
    JOIN brands b ON b.id = o.brand_id
    WHERE o.id = onesheet_ad_assets.onesheet_id
    AND b.user_id = auth.uid()
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_onesheet_ad_assets_onesheet_id ON onesheet_ad_assets(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_ad_assets_ad_id ON onesheet_ad_assets(ad_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_current_stage ON onesheet(current_stage);
CREATE INDEX IF NOT EXISTS idx_onesheet_brand_id_stages ON onesheet(brand_id, stages_completed); 