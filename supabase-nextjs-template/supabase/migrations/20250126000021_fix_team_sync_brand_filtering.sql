-- Fix team-sync brand filtering by adding brand_id columns and updating RLS policies
-- This migration handles existing policies properly

-- Add brand_id columns to team sync tables if they don't exist
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add indexes for the new brand_id columns
CREATE INDEX IF NOT EXISTS announcements_brand_id_idx ON public.announcements(brand_id);
CREATE INDEX IF NOT EXISTS issues_brand_id_idx ON public.issues(brand_id);
CREATE INDEX IF NOT EXISTS todos_brand_id_idx ON public.todos(brand_id);

-- Drop ALL existing policies for announcements table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Users can insert their own announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Users can update their own announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Users can delete their own announcements" ON public.announcements;
    DROP POLICY IF EXISTS "Users can view announcements for brands they have access to" ON public.announcements;
    DROP POLICY IF EXISTS "Users can insert announcements for brands they have access to" ON public.announcements;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- Drop ALL existing policies for issues table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all issues" ON public.issues;
    DROP POLICY IF EXISTS "Users can insert their own issues" ON public.issues;
    DROP POLICY IF EXISTS "Users can update their own issues or assigned issues" ON public.issues;
    DROP POLICY IF EXISTS "Users can delete their own issues" ON public.issues;
    DROP POLICY IF EXISTS "Users can view issues for brands they have access to" ON public.issues;
    DROP POLICY IF EXISTS "Users can insert issues for brands they have access to" ON public.issues;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- Drop ALL existing policies for todos table
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can view todos for brands they have access to" ON public.todos;
    DROP POLICY IF EXISTS "Users can insert todos for brands they have access to" ON public.todos;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if policies don't exist
END $$;

-- Create new brand-aware RLS policies for announcements
CREATE POLICY "announcements_select_brand_access" 
    ON public.announcements FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "announcements_insert_brand_access" 
    ON public.announcements FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "announcements_update_own" 
    ON public.announcements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "announcements_delete_own" 
    ON public.announcements FOR DELETE
    USING (auth.uid() = user_id);

-- Create new brand-aware RLS policies for issues
CREATE POLICY "issues_select_brand_access" 
    ON public.issues FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "issues_insert_brand_access" 
    ON public.issues FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "issues_update_own_or_assigned" 
    ON public.issues FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "issues_delete_own" 
    ON public.issues FOR DELETE
    USING (auth.uid() = user_id);

-- Create new brand-aware RLS policies for todos
CREATE POLICY "todos_select_brand_access" 
    ON public.todos FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "todos_insert_brand_access" 
    ON public.todos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "todos_update_own_or_assigned" 
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "todos_delete_own" 
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id); 