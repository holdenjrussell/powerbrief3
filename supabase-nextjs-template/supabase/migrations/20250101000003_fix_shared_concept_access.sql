-- Fix public access to shared brief concepts
-- This migration ensures that shared concepts can be accessed publicly
-- while maintaining security for non-shared content

-- Drop and recreate the public access policy for brief_concepts to be more specific
DROP POLICY IF EXISTS "Allow public access to shared brief concepts" ON public.brief_concepts;
CREATE POLICY "Allow public access to shared brief concepts"
    ON public.brief_concepts FOR SELECT
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Drop and recreate the public access policy for brief_batches to be more specific  
DROP POLICY IF EXISTS "Allow public access to shared brief batches" ON public.brief_batches;
CREATE POLICY "Allow public access to shared brief batches"
    ON public.brief_batches FOR SELECT
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Ensure brands can be accessed for shared content
DROP POLICY IF EXISTS "Allow public access to brands for shared content" ON public.brands;
CREATE POLICY "Allow public access to brands for shared content"
    ON public.brands FOR SELECT
    USING (true);

-- Add policy to allow public updates to shared concepts (for review status updates)
DROP POLICY IF EXISTS "Allow public updates to shared brief concepts" ON public.brief_concepts;
CREATE POLICY "Allow public updates to shared brief concepts"
    ON public.brief_concepts FOR UPDATE
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb)
    WITH CHECK (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('brief_batches', 'brief_concepts', 'brands') 
AND policyname LIKE '%public access%' OR policyname LIKE '%shared%'; 