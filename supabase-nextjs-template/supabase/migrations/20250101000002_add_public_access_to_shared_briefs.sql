-- Add public access policies for shared brief batches and concepts
-- This mirrors the UGC script sharing pattern that works successfully

-- Add policy for public access to shared brief batches
-- This allows anyone to view batches that have share_settings configured
DROP POLICY IF EXISTS "Allow public access to shared brief batches" ON public.brief_batches;
CREATE POLICY "Allow public access to shared brief batches"
    ON public.brief_batches FOR SELECT
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Add policy for public access to shared brief concepts  
-- This allows anyone to view concepts that have share_settings configured
DROP POLICY IF EXISTS "Allow public access to shared brief concepts" ON public.brief_concepts;
CREATE POLICY "Allow public access to shared brief concepts"
    ON public.brief_concepts FOR SELECT
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Add policy for public access to brands for shared content
-- This allows anyone to view brand data when accessing shared content
DROP POLICY IF EXISTS "Allow public access to brands for shared content" ON public.brands;
CREATE POLICY "Allow public access to brands for shared content"
    ON public.brands FOR SELECT
    USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('brief_batches', 'brief_concepts', 'brands') 
AND policyname LIKE '%public access%'; 