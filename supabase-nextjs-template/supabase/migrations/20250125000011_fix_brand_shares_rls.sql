-- Fix RLS policies for brand_shares table
-- This ensures brand sharing functionality works properly

-- Enable RLS on brand_shares table
ALTER TABLE public.brand_shares ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can create shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can update shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can delete shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Shared users can update their own shares" ON public.brand_shares;

-- SELECT: Users can view shares they're involved in
CREATE POLICY "Users can view shares they are involved in" 
    ON public.brand_shares FOR SELECT
    USING (
        -- User is the one who shared (brand owner)
        auth.uid() = shared_by_user_id
        OR
        -- User is the recipient of the share
        auth.uid() = shared_with_user_id
        OR
        -- User owns the brand being shared
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- INSERT: Brand owners can create shares
CREATE POLICY "Brand owners can create shares" 
    ON public.brand_shares FOR INSERT
    WITH CHECK (
        -- User must own the brand they're sharing
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
        AND
        -- User must be the one creating the share
        auth.uid() = shared_by_user_id
    );

-- UPDATE: Brand owners and recipients can update shares
CREATE POLICY "Users can update shares they are involved in" 
    ON public.brand_shares FOR UPDATE
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
        OR
        -- User is the recipient (can accept/reject)
        auth.uid() = shared_with_user_id
    )
    WITH CHECK (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
        OR
        -- User is the recipient
        auth.uid() = shared_with_user_id
    );

-- DELETE: Only brand owners can delete shares
CREATE POLICY "Brand owners can delete shares" 
    ON public.brand_shares FOR DELETE
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
    ); 