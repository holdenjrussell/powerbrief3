-- Fix todos RLS policies to support brand sharing
-- This allows users with shared brand access to view and be assigned to todos

-- Drop existing policies for todos
DROP POLICY IF EXISTS "Users can view todos for brands they have access to" ON public.todos;
DROP POLICY IF EXISTS "Users can insert todos for their brands" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

-- CREATE new policies that support brand sharing

-- SELECT: Users can view todos for brands they own or have been shared with
CREATE POLICY "Users can view todos for accessible brands" 
    ON public.todos FOR SELECT
    USING (
        -- Global todos (no brand_id)
        brand_id IS NULL
        OR
        -- User created the todo
        auth.uid() = user_id
        OR
        -- User is assigned to the todo
        auth.uid() = assignee_id
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = todos.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has accepted share access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = brands.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                )
            )
        )
    );

-- INSERT: Users can create todos for brands they own or have editor access to
CREATE POLICY "Users can insert todos for accessible brands" 
    ON public.todos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Global todos (no brand_id)
            brand_id IS NULL
            OR
            -- User owns the brand
            EXISTS (
                SELECT 1 FROM public.brands 
                WHERE id = brand_id 
                AND user_id = auth.uid()
            )
            OR
            -- User has editor access to the brand
            EXISTS (
                SELECT 1 FROM public.brands b
                JOIN public.brand_shares bs ON bs.brand_id = b.id
                WHERE b.id = brand_id
                AND bs.shared_with_user_id = auth.uid()
                AND bs.status = 'accepted'
                AND bs.role = 'editor'
            )
        )
    );

-- UPDATE: Users can update todos they created, are assigned to, or have access through brand sharing
CREATE POLICY "Users can update accessible todos" 
    ON public.todos FOR UPDATE
    USING (
        -- User created the todo
        auth.uid() = user_id
        OR
        -- User is assigned to the todo
        auth.uid() = assignee_id
        OR
        -- User has editor access to the brand
        (
            brand_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.brands b
                JOIN public.brand_shares bs ON bs.brand_id = b.id
                WHERE b.id = todos.brand_id
                AND bs.shared_with_user_id = auth.uid()
                AND bs.status = 'accepted'
                AND bs.role = 'editor'
            )
        )
    );

-- DELETE: Users can delete todos they created or have brand owner access
CREATE POLICY "Users can delete accessible todos" 
    ON public.todos FOR DELETE
    USING (
        -- User created the todo
        auth.uid() = user_id
        OR
        -- User owns the brand (only brand owners can delete, not editors)
        (
            brand_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.brands 
                WHERE id = todos.brand_id 
                AND user_id = auth.uid()
            )
        )
    );

-- Add comments to explain the policies
COMMENT ON POLICY "Users can view todos for accessible brands" ON public.todos 
    IS 'Allows users to view todos for brands they own, have been shared with, or are assigned to';

COMMENT ON POLICY "Users can insert todos for accessible brands" ON public.todos 
    IS 'Allows users to create todos for brands they own or have editor access to';

COMMENT ON POLICY "Users can update accessible todos" ON public.todos 
    IS 'Allows users to update todos they created, are assigned to, or have editor access to through brand sharing';

COMMENT ON POLICY "Users can delete accessible todos" ON public.todos 
    IS 'Allows users to delete todos they created or for brands they own (not just editor access)'; 