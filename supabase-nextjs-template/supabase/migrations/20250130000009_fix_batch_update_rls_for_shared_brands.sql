-- Fix RLS policy for brief_batches to allow batch settings updates by users with brand access
-- This ensures users with shared brand access can modify batch settings like allow_new_concepts

-- Drop the existing UPDATE policy for brief_batches
DROP POLICY IF EXISTS "Users can update accessible brief batches" ON public.brief_batches;
DROP POLICY IF EXISTS "Users can update their own brief batches" ON public.brief_batches;

-- Create a comprehensive UPDATE policy that allows updates if user has brand access
CREATE POLICY "Users can update batches in accessible brands" 
    ON public.brief_batches FOR UPDATE
    USING (
        -- User created the batch
        auth.uid() = user_id 
        OR
        -- User has access to the brand (either as owner or through sharing)
        EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.id = brief_batches.brand_id
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
                    AND bs.role IN ('editor', 'viewer') -- Allow both editors and viewers to update batch settings
                )
            )
        )
    );

-- Also ensure the SELECT policy allows viewing batches for shared brands
DROP POLICY IF EXISTS "Users can view brief batches for accessible brands" ON public.brief_batches;
DROP POLICY IF EXISTS "Users can view their own brief batches" ON public.brief_batches;

CREATE POLICY "Users can view batches in accessible brands" 
    ON public.brief_batches FOR SELECT
    USING (
        -- User created the batch
        auth.uid() = user_id 
        OR
        -- User has access to the brand (either as owner or through sharing)
        EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.id = brief_batches.brand_id
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
        -- Batch is shared publicly (has share_settings)
        share_settings IS NOT NULL AND share_settings != '{}'::jsonb
    );

-- Add comment to document the policy
COMMENT ON POLICY "Users can update batches in accessible brands" ON public.brief_batches IS 'Allows users to update batch settings if they own the brand or have shared access to it'; 