-- Fix ad_drafts access for shared brand users
-- This migration adds RLS policies to allow users with shared brand access to view/edit drafts

-- First, ensure RLS is enabled on ad_drafts
ALTER TABLE public.ad_drafts ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Users can view their own ad drafts" ON public.ad_drafts;
DROP POLICY IF EXISTS "Users can insert their own ad drafts" ON public.ad_drafts;
DROP POLICY IF EXISTS "Users can update their own ad drafts" ON public.ad_drafts;
DROP POLICY IF EXISTS "Users can delete their own ad drafts" ON public.ad_drafts;

-- Create new SELECT policy that includes shared brand access
CREATE POLICY "Users can view ad drafts for accessible brands" 
    ON public.ad_drafts FOR SELECT
    USING (
        -- User owns the draft
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_drafts.brand_id 
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

-- Create INSERT policy for users to create drafts for brands they have editor access to
CREATE POLICY "Users can create ad drafts for editable brands" 
    ON public.ad_drafts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_drafts.brand_id 
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

-- Create UPDATE policy for users to update drafts they created or have editor access to
CREATE POLICY "Users can update ad drafts they created or have editor access to" 
    ON public.ad_drafts FOR UPDATE
    USING (
        -- User created the draft
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_drafts.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Create DELETE policy - users can delete drafts they created or have editor access to the brand
CREATE POLICY "Users can delete ad drafts they created or have editor access to" 
    ON public.ad_drafts FOR DELETE
    USING (
        -- User created the draft
        auth.uid() = user_id 
        OR
        -- User has editor access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = ad_drafts.brand_id 
            AND EXISTS (
                SELECT 1 FROM brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
                AND brand_shares.role = 'editor'
            )
        )
    );

-- Also ensure RLS is enabled on ad_draft_assets
ALTER TABLE public.ad_draft_assets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on ad_draft_assets
DROP POLICY IF EXISTS "Users can view assets for accessible drafts" ON public.ad_draft_assets;
DROP POLICY IF EXISTS "Users can insert assets for accessible drafts" ON public.ad_draft_assets;
DROP POLICY IF EXISTS "Users can update assets for accessible drafts" ON public.ad_draft_assets;
DROP POLICY IF EXISTS "Users can delete assets for accessible drafts" ON public.ad_draft_assets;

-- Create policies for ad_draft_assets based on parent draft access
CREATE POLICY "Users can view assets for accessible drafts" 
    ON public.ad_draft_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ad_drafts
            WHERE ad_drafts.id = ad_draft_assets.ad_draft_id
            AND (
                -- User owns the draft
                ad_drafts.user_id = auth.uid()
                OR
                -- User has access to the brand
                EXISTS (
                    SELECT 1 FROM brands 
                    WHERE brands.id = ad_drafts.brand_id 
                    AND (
                        brands.user_id = auth.uid() 
                        OR
                        EXISTS (
                            SELECT 1 FROM brand_shares
                            WHERE brand_shares.brand_id = brands.id
                            AND brand_shares.shared_with_user_id = auth.uid()
                            AND brand_shares.status = 'accepted'
                        )
                    )
                )
            )
        )
    );

CREATE POLICY "Users can insert assets for editable drafts" 
    ON public.ad_draft_assets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ad_drafts
            WHERE ad_drafts.id = ad_draft_assets.ad_draft_id
            AND (
                -- User owns the draft
                ad_drafts.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brands 
                    WHERE brands.id = ad_drafts.brand_id 
                    AND EXISTS (
                        SELECT 1 FROM brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    );

CREATE POLICY "Users can update assets for editable drafts" 
    ON public.ad_draft_assets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ad_drafts
            WHERE ad_drafts.id = ad_draft_assets.ad_draft_id
            AND (
                -- User owns the draft
                ad_drafts.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brands 
                    WHERE brands.id = ad_drafts.brand_id 
                    AND EXISTS (
                        SELECT 1 FROM brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    );

CREATE POLICY "Users can delete assets for editable drafts" 
    ON public.ad_draft_assets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ad_drafts
            WHERE ad_drafts.id = ad_draft_assets.ad_draft_id
            AND (
                -- User owns the draft
                ad_drafts.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brands 
                    WHERE brands.id = ad_drafts.brand_id 
                    AND EXISTS (
                        SELECT 1 FROM brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    );

-- Add comments to document the changes
COMMENT ON TABLE public.ad_drafts IS 'Stores ad drafts for the Ad Upload Tool. Accessible by brand owners and users with shared brand access.';
COMMENT ON TABLE public.ad_draft_assets IS 'Stores assets for ad drafts. Access controlled through parent ad_draft permissions.'; 