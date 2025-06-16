-- Fix RLS policies for brand_n8n_workflows using the correct brand sharing pattern
-- This follows the exact same pattern as other working brand sharing RLS policies

-- Drop the existing policies
DROP POLICY IF EXISTS "Users can view n8n workflows for accessible brands" ON public.brand_n8n_workflows;
DROP POLICY IF EXISTS "Users can insert n8n workflows for accessible brands" ON public.brand_n8n_workflows;
DROP POLICY IF EXISTS "Users can update n8n workflows for accessible brands" ON public.brand_n8n_workflows;
DROP POLICY IF EXISTS "Users can delete n8n workflows for accessible brands" ON public.brand_n8n_workflows;

-- SELECT: Users can view workflows for brands they have access to
CREATE POLICY "Users can view n8n workflows for accessible brands" 
    ON public.brand_n8n_workflows FOR SELECT
    USING (
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_n8n_workflows.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- INSERT: Users can create workflows for brands they have editor access to
CREATE POLICY "Users can create n8n workflows for accessible brands" 
    ON public.brand_n8n_workflows FOR INSERT
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- UPDATE: Users can update workflows for brands they have editor access to
CREATE POLICY "Users can update n8n workflows for accessible brands" 
    ON public.brand_n8n_workflows FOR UPDATE
    USING (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_n8n_workflows.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    )
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_n8n_workflows.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- DELETE: Only brand owners can delete workflows
CREATE POLICY "Users can delete n8n workflows for owned brands" 
    ON public.brand_n8n_workflows FOR DELETE
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_n8n_workflows.brand_id
            AND brands.user_id = auth.uid()
        )
    ); 