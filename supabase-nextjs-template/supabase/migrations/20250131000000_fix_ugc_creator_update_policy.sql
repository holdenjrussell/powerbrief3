-- Fix UGC creator update policy to allow brand owners to update creators
-- The current policy was missing a check for brand ownership, only checking for shared access

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update ugc creators they created or have editor access to" ON public.ugc_creators;

-- Create new UPDATE policy that properly checks for brand ownership
CREATE POLICY "Users can update ugc creators they created or have editor access to" 
    ON public.ugc_creators FOR UPDATE
    USING (
        -- User created the creator
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or editor)
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

-- Also fix the DELETE policy to include brand ownership check
DROP POLICY IF EXISTS "Users can delete ugc creators they created or have editor access to" ON public.ugc_creators;

CREATE POLICY "Users can delete ugc creators they created or have editor access to" 
    ON public.ugc_creators FOR DELETE
    USING (
        -- User created the creator
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or editor)
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

-- Add comment to document the fix
COMMENT ON TABLE public.ugc_creators IS 'Stores UGC creators for brands. Accessible by brand owners and users with shared brand access. Fixed to allow brand owners to update/delete creators regardless of who created them.'; 