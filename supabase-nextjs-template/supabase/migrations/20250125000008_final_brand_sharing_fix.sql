-- Final fix for brand sharing RLS
-- This properly implements sharing while ensuring owners always have full access

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own brands and shared brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands or shared brands with editor role" ON public.brands;

-- SELECT: Owners and accepted shares can view
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

-- UPDATE: Owners and editors can update
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

-- INSERT and DELETE policies should already exist from the first migration
-- If not, let's ensure they exist
DO $$
BEGIN
    -- Check if INSERT policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brands' 
        AND policyname = 'Users can create brands'
    ) THEN
        CREATE POLICY "Users can create brands" 
            ON public.brands FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
            );
    END IF;
    
    -- Check if DELETE policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brands' 
        AND policyname = 'Users can delete their own brands'
    ) THEN
        CREATE POLICY "Users can delete their own brands" 
            ON public.brands FOR DELETE
            USING (
                auth.uid() = user_id
            );
    END IF;
END $$; 