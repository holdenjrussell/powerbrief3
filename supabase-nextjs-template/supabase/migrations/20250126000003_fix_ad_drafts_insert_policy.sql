-- Fix ad_drafts INSERT policy for shared brand users
-- The previous policy was too restrictive on user_id matching

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create ad drafts for editable brands" ON public.ad_drafts;

-- Create new INSERT policy that allows shared users to create drafts
-- The key change is removing the strict user_id = auth.uid() requirement
CREATE POLICY "Users can create ad drafts for editable brands" 
    ON public.ad_drafts FOR INSERT
    WITH CHECK (
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

-- Also fix the UPDATE policy to be more permissive
DROP POLICY IF EXISTS "Users can update ad drafts they created or have editor access to" ON public.ad_drafts;

CREATE POLICY "Users can update ad drafts for brands they have editor access to" 
    ON public.ad_drafts FOR UPDATE
    USING (
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

-- Fix DELETE policy as well
DROP POLICY IF EXISTS "Users can delete ad drafts they created or have editor access to" ON public.ad_drafts;

CREATE POLICY "Users can delete ad drafts for brands they have editor access to" 
    ON public.ad_drafts FOR DELETE
    USING (
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