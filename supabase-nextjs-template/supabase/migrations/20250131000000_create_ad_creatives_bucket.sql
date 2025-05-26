-- Create ad-creatives storage bucket for PowerBrief asset uploads
-- This bucket will store creative assets uploaded through the PowerBriefAssetUpload component
-- NOTE: This is configured for public uploads since it's used on public share pages

-- Create the ad-creatives bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-creatives', 
  'ad-creatives', 
  true,
  1073741824, -- 1GB in bytes (1024 * 1024 * 1024)
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 1073741824,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo'
  ];

-- Set up RLS policies for the ad-creatives bucket
-- These policies allow public access since this is used on public share pages

-- Allow public read access for ad-creatives
DROP POLICY IF EXISTS "Allow public read access for ad-creatives" ON storage.objects;
CREATE POLICY "Allow public read access for ad-creatives"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ad-creatives');

-- Allow public uploads to ad-creatives (for public share pages)
DROP POLICY IF EXISTS "Allow public uploads to ad-creatives" ON storage.objects;
CREATE POLICY "Allow public uploads to ad-creatives"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ad-creatives');

-- Allow authenticated users to upload to ad-creatives (fallback for logged-in users)
DROP POLICY IF EXISTS "Allow authenticated users to upload to ad-creatives" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to ad-creatives"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ad-creatives' AND auth.role() = 'authenticated');

-- Allow users to update their own objects in ad-creatives (only for authenticated users)
DROP POLICY IF EXISTS "Allow users to update their own objects in ad-creatives" ON storage.objects;
CREATE POLICY "Allow users to update their own objects in ad-creatives"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'ad-creatives' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'ad-creatives');

-- Allow users to delete their own objects in ad-creatives (only for authenticated users)
DROP POLICY IF EXISTS "Allow users to delete their own objects in ad-creatives" ON storage.objects;
CREATE POLICY "Allow users to delete their own objects in ad-creatives"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'ad-creatives' AND auth.uid() = owner); 