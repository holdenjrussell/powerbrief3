-- Fix ad_configurations access for shared brand users
-- This migration updates RLS policies to allow users with shared brand access to view configurations

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own ad configurations" ON ad_configurations;

-- Create new SELECT policy that includes shared brand access
CREATE POLICY "Users can view ad configurations for accessible brands" 
    ON ad_configurations FOR SELECT
    USING (
        -- User owns the configuration
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_configurations.brand_id 
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

-- Update INSERT policy to ensure users can only create configs for brands they have editor access to
DROP POLICY IF EXISTS "Users can insert their own ad configurations" ON ad_configurations;

CREATE POLICY "Users can create ad configurations for editable brands" 
    ON ad_configurations FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_configurations.brand_id 
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

-- Update UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update their own ad configurations" ON ad_configurations;

CREATE POLICY "Users can update ad configurations they created or have editor access to" 
    ON ad_configurations FOR UPDATE
    USING (
        -- User created the configuration
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_configurations.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Keep DELETE policy restricted to configuration creators only
-- (We don't want shared users deleting configurations they didn't create)

-- Add comment to document the change
COMMENT ON TABLE ad_configurations IS 'Stores saved ad upload configurations for brands. Accessible by brand owners and users with shared brand access.';

-- =====================================================
-- Fix ad_batches access for shared brand users
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own ad batches" ON ad_batches;

-- Create new SELECT policy that includes shared brand access
CREATE POLICY "Users can view ad batches for accessible brands" 
    ON ad_batches FOR SELECT
    USING (
        -- User owns the ad batch
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_batches.brand_id 
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

-- Update INSERT policy for ad_batches
DROP POLICY IF EXISTS "Users can insert their own ad batches" ON ad_batches;

CREATE POLICY "Users can create ad batches for editable brands" 
    ON ad_batches FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_batches.brand_id 
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

-- Update UPDATE policy for ad_batches
DROP POLICY IF EXISTS "Users can update their own ad batches" ON ad_batches;

CREATE POLICY "Users can update ad batches they created or have editor access to" 
    ON ad_batches FOR UPDATE
    USING (
        -- User created the ad batch
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_batches.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Keep DELETE policy restricted to ad batch creators only

-- Add comment to document the change
COMMENT ON TABLE ad_batches IS 'Stores ad batch configurations for the Ad Upload Tool. Accessible by brand owners and users with shared brand access.'; 