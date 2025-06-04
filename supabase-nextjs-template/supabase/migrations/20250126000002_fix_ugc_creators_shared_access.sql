-- Fix UGC creators access for shared brand users
-- This migration updates RLS policies to allow users with shared brand access to view/edit UGC creators

-- =====================================================
-- Fix ugc_creators access for shared brand users
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own ugc creators" ON public.ugc_creators;
DROP POLICY IF EXISTS "Users can insert their own ugc creators" ON public.ugc_creators;
DROP POLICY IF EXISTS "Users can update their own ugc creators" ON public.ugc_creators;
DROP POLICY IF EXISTS "Users can delete their own ugc creators" ON public.ugc_creators;

-- Create new SELECT policy that includes shared brand access
CREATE POLICY "Users can view ugc creators for accessible brands" 
    ON public.ugc_creators FOR SELECT
    USING (
        -- User owns the creator
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creators.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- Create INSERT policy for users to create creators for brands they have editor access to
CREATE POLICY "Users can create ugc creators for editable brands" 
    ON public.ugc_creators FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creators.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create UPDATE policy for users to update creators they created or have editor access to
CREATE POLICY "Users can update ugc creators they created or have editor access to" 
    ON public.ugc_creators FOR UPDATE
    USING (
        -- User created the creator
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creators.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Create DELETE policy - users can delete creators they created or have editor access to the brand
CREATE POLICY "Users can delete ugc creators they created or have editor access to" 
    ON public.ugc_creators FOR DELETE
    USING (
        -- User created the creator
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creators.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- =====================================================
-- Fix ugc_creator_scripts access for shared brand users
-- =====================================================

-- Drop existing policies (except public share policy)
DROP POLICY IF EXISTS "Users can view their own ugc creator scripts" ON public.ugc_creator_scripts;
DROP POLICY IF EXISTS "Users can insert their own ugc creator scripts" ON public.ugc_creator_scripts;
DROP POLICY IF EXISTS "Users can update their own ugc creator scripts" ON public.ugc_creator_scripts;
DROP POLICY IF EXISTS "Users can delete their own ugc creator scripts" ON public.ugc_creator_scripts;

-- Create new SELECT policy that includes shared brand access
CREATE POLICY "Users can view ugc creator scripts for accessible brands" 
    ON public.ugc_creator_scripts FOR SELECT
    USING (
        -- User owns the script
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creator_scripts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- Create INSERT policy for users to create scripts for brands they have editor access to
CREATE POLICY "Users can create ugc creator scripts for editable brands" 
    ON public.ugc_creator_scripts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creator_scripts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create UPDATE policy for users to update scripts they created or have editor access to
CREATE POLICY "Users can update ugc creator scripts they created or have editor access to" 
    ON public.ugc_creator_scripts FOR UPDATE
    USING (
        -- User created the script
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creator_scripts.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Create DELETE policy - users can delete scripts they created or have editor access to the brand
CREATE POLICY "Users can delete ugc creator scripts they created or have editor access to" 
    ON public.ugc_creator_scripts FOR DELETE
    USING (
        -- User created the script
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ugc_creator_scripts.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Add comments to document the changes
COMMENT ON TABLE public.ugc_creators IS 'Stores UGC creators for brands. Accessible by brand owners and users with shared brand access.';
COMMENT ON TABLE public.ugc_creator_scripts IS 'Stores scripts for UGC creators. Accessible by brand owners and users with shared brand access.'; 