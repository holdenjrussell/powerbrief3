-- Fix RLS policy for brief_concepts to allow updates within accessible brands
-- This fixes the issue where users can't update concepts created by other users in the same brand

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update accessible brief concepts" ON public.brief_concepts;

-- Create a more permissive policy that allows updates if user has access to the brand
CREATE POLICY "Users can update accessible brief concepts" 
    ON public.brief_concepts FOR UPDATE
    USING (
        -- User created the concept
        auth.uid() = user_id 
        OR
        -- User has access to the brand through the batch (either as owner or through sharing)
        EXISTS (
            SELECT 1 FROM public.brief_batches bb
            JOIN public.brands b ON b.id = bb.brand_id
            WHERE bb.id = brief_concepts.brief_batch_id
            AND (
                -- User owns the brand
                b.user_id = auth.uid() 
                OR
                -- User has access through brand sharing
                EXISTS (
                    SELECT 1 FROM public.brand_shares bs
                    WHERE bs.brand_id = b.id
                    AND bs.shared_with_user_id = auth.uid()
                    AND bs.status = 'accepted'
                    AND bs.role IN ('editor', 'viewer') -- Allow both editors and viewers to update concepts
                )
            )
        )
    );

-- Also ensure the SELECT policy is similarly permissive
DROP POLICY IF EXISTS "Users can view brief concepts for accessible brands" ON public.brief_concepts;

CREATE POLICY "Users can view brief concepts for accessible brands" 
    ON public.brief_concepts FOR SELECT
    USING (
        -- User created the concept
        auth.uid() = user_id 
        OR
        -- User has access to the brand through the batch
        EXISTS (
            SELECT 1 FROM public.brief_batches bb
            JOIN public.brands b ON b.id = bb.brand_id
            WHERE bb.id = brief_concepts.brief_batch_id
            AND (
                -- User owns the brand
                b.user_id = auth.uid() 
                OR
                -- User has access through brand sharing
                EXISTS (
                    SELECT 1 FROM public.brand_shares bs
                    WHERE bs.brand_id = b.id
                    AND bs.shared_with_user_id = auth.uid()
                    AND bs.status = 'accepted'
                )
            )
        )
        OR
        -- Concept is shared publicly (has share_settings)
        share_settings IS NOT NULL AND share_settings != '{}'::jsonb
    ); 