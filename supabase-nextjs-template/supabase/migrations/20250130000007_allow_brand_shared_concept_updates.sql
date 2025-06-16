-- Allow users with brand access (owner or shared) to update concepts in that brand
-- This fixes the issue where team members can't update concepts created by others

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update accessible brief concepts" ON public.brief_concepts;

-- Create a simple policy that allows updates if user has brand access
CREATE POLICY "Users can update concepts in accessible brands" 
    ON public.brief_concepts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM brief_batches bb
            JOIN brands b ON bb.brand_id = b.id
            WHERE bb.id = brief_batch_id
            AND (
                -- User owns the brand
                b.user_id = auth.uid()
                OR
                -- User has been granted access to the brand through sharing
                EXISTS (
                    SELECT 1 
                    FROM brand_shares bs
                    WHERE bs.brand_id = b.id 
                    AND bs.shared_with_user_id = auth.uid()
                    AND bs.status = 'accepted'
                )
            )
        )
    );

-- Also update the SELECT policy to be consistent
DROP POLICY IF EXISTS "Users can view accessible brief concepts" ON public.brief_concepts;

CREATE POLICY "Users can view concepts in accessible brands" 
    ON public.brief_concepts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM brief_batches bb
            JOIN brands b ON bb.brand_id = b.id
            WHERE bb.id = brief_batch_id
            AND (
                -- User owns the brand
                b.user_id = auth.uid()
                OR
                -- User has been granted access to the brand through sharing
                EXISTS (
                    SELECT 1 
                    FROM brand_shares bs
                    WHERE bs.brand_id = b.id 
                    AND bs.shared_with_user_id = auth.uid()
                    AND bs.status = 'accepted'
                )
            )
        )
    ); 