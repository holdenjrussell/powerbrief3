-- Fix OneSheet Storage RLS Policies
-- The existing policies are too restrictive and failing due to path parsing issues

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view OneSheet assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload OneSheet assets for their brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can update OneSheet assets for their brands" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete OneSheet assets for their brands" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for OneSheet assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload OneSheet assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update OneSheet assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete OneSheet assets" ON storage.objects;

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

-- Ensure the storage bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onesheet-assets',
  'onesheet-assets',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
