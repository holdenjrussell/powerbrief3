-- Comprehensive fix for brands table RLS policies
-- This ensures all CRUD operations work correctly for brand owners and shared users

-- First, enable RLS on brands table if not already enabled
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on brands table
DROP POLICY IF EXISTS "Users can view brands they have access to" ON public.brands;
DROP POLICY IF EXISTS "Users can view owned and shared brands" ON public.brands;
DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

-- Create comprehensive SELECT policy
CREATE POLICY "Users can view brands they have access to" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand
        auth.uid() = user_id 
        OR
        -- User has a share (any status - we'll filter by status in the app)
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
        )
        OR
        -- User is part of an organization that owns the brand (if applicable)
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members
                WHERE organization_members.organization_id = brands.organization_id
                AND organization_members.user_id = auth.uid()
            )
        )
    );

-- Create INSERT policy - users can create brands
CREATE POLICY "Users can create brands" 
    ON public.brands FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

-- Create UPDATE policy - only owners can update
CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (
        auth.uid() = user_id
        OR
        -- Allow editors to update (but not delete)
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
            AND brand_shares.role = 'editor'
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR
        -- Allow editors to update (but not delete)
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_shares.brand_id = brands.id
            AND brand_shares.shared_with_user_id = auth.uid()
            AND brand_shares.status = 'accepted'
            AND brand_shares.role = 'editor'
        )
    );

-- Create DELETE policy - only owners can delete
CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- Also ensure brand_shares table has proper RLS
ALTER TABLE public.brand_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on brand_shares
DROP POLICY IF EXISTS "Users can view shares they are involved in" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can create shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can update shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Brand owners can delete shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Shared users can update their own shares" ON public.brand_shares;

-- Create policies for brand_shares table
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

CREATE POLICY "Brand owners can update shares" 
    ON public.brand_shares FOR UPDATE
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_shares.brand_id
            AND brands.user_id = auth.uid()
        )
    );

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

CREATE POLICY "Shared users can update their own shares" 
    ON public.brand_shares FOR UPDATE
    USING (
        -- User is the recipient and can update their own share (e.g., accept/reject)
        auth.uid() = shared_with_user_id
    )
    WITH CHECK (
        -- User is the recipient
        auth.uid() = shared_with_user_id
    ); 