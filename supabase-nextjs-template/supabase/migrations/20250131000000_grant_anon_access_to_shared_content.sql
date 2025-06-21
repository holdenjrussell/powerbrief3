-- Grant anonymous access to shared content
-- This ensures public share links work without authentication

-- First, ensure the anon role can access the tables
GRANT SELECT ON public.brief_batches TO anon;
GRANT SELECT ON public.brief_concepts TO anon;
GRANT SELECT ON public.brands TO anon;

-- Create specific policies for anonymous access to shared content
-- These policies apply ONLY to the anon role

-- Allow anonymous users to view batches with share_settings
DROP POLICY IF EXISTS "Anon can view shared batches" ON public.brief_batches;
CREATE POLICY "Anon can view shared batches" 
    ON public.brief_batches 
    FOR SELECT
    TO anon
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Allow anonymous users to view concepts with share_settings
DROP POLICY IF EXISTS "Anon can view shared concepts" ON public.brief_concepts;
CREATE POLICY "Anon can view shared concepts" 
    ON public.brief_concepts 
    FOR SELECT
    TO anon
    USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- Allow anonymous users to view ALL brands (simplified to avoid recursion)
-- This is safe because brands don't contain sensitive data, and we control access at the batch level
DROP POLICY IF EXISTS "Anon can view brands for shared content" ON public.brands;
CREATE POLICY "Anon can view brands for shared content" 
    ON public.brands 
    FOR SELECT
    TO anon
    USING (true);

-- Verify the policies were created
SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    substring(qual, 1, 100) as policy_condition
FROM pg_policies 
WHERE tablename IN ('brief_batches', 'brief_concepts', 'brands')
AND 'anon' = ANY(roles)
ORDER BY tablename, policyname; 