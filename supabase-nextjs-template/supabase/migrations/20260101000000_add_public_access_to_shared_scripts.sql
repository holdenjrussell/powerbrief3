-- Add policy for public access to shared ugc scripts
-- This allows anyone to view scripts that have a public_share_id, even without authentication

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public access to shared scripts" ON public.ugc_creator_scripts;

-- Create the policy to allow public access to scripts with a public_share_id
CREATE POLICY "Allow public access to shared scripts"
    ON public.ugc_creator_scripts FOR SELECT
    USING (public_share_id IS NOT NULL); 