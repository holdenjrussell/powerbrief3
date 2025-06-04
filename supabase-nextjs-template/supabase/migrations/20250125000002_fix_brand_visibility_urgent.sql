-- URGENT FIX: Ensure brand owners can always see their own brands
-- This is a minimal fix to address the immediate issue

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view owned and shared brands" ON public.brands;

-- Create a simple policy that ensures owners ALWAYS see their brands
-- We'll handle organization and sharing logic separately
CREATE POLICY "Users can view brands they have access to" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand - this is the most important condition
        auth.uid() = user_id 
        OR
        -- User has accepted share access
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_id = brands.id
            AND shared_with_user_id = auth.uid()
            AND status = 'accepted'
        )
    ); 