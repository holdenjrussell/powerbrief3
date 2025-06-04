-- Proper brand sharing RLS implementation
-- This adds sharing support while maintaining full owner access

-- Update the SELECT policy to include shared brands
DROP POLICY IF EXISTS "Users can view their own brands and shared brands" ON public.brands;

CREATE POLICY "Users can view their own brands and shared brands" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand (ALWAYS allow)
        auth.uid() = user_id 
        OR
        -- User has accepted share access
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
        )
    );

-- Update the UPDATE policy to allow editors
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;

CREATE POLICY "Users can update their own brands or shared brands with editor role" 
    ON public.brands FOR UPDATE
    USING (
        -- Owner can always update
        auth.uid() = user_id
        OR
        -- Editors can update
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
            AND brand_shares.role = 'editor'
        )
    )
    WITH CHECK (
        -- Owner can always update
        auth.uid() = user_id
        OR
        -- Editors can update
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
            AND brand_shares.role = 'editor'
        )
    );

-- Keep DELETE restricted to owners only (as intended)
-- INSERT and DELETE policies remain unchanged from the rollback 