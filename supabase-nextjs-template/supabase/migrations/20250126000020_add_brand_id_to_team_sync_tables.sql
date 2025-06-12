-- Add brand_id columns to team sync tables and update RLS policies
-- This migration fixes the issue where todos, issues, and announcements show across all brands

-- Add brand_id column to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add brand_id column to issues table  
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add brand_id column to todos table
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add indexes for the new brand_id columns
CREATE INDEX IF NOT EXISTS announcements_brand_id_idx ON public.announcements(brand_id);
CREATE INDEX IF NOT EXISTS issues_brand_id_idx ON public.issues(brand_id);
CREATE INDEX IF NOT EXISTS todos_brand_id_idx ON public.todos(brand_id);

-- Drop existing RLS policies for these tables
DROP POLICY IF EXISTS "Users can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can insert their own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can update their own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can delete their own announcements" ON public.announcements;

DROP POLICY IF EXISTS "Users can view all issues" ON public.issues;
DROP POLICY IF EXISTS "Users can insert their own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update their own issues or assigned issues" ON public.issues;
DROP POLICY IF EXISTS "Users can delete their own issues" ON public.issues;

DROP POLICY IF EXISTS "Users can view all todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

-- Create new brand-aware RLS policies for announcements
CREATE POLICY "Users can view announcements for brands they have access to" 
    ON public.announcements FOR SELECT
    USING (
        -- Brand owner can see all announcements for their brand
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        -- Users with shared access can see announcements for shared brands
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "Users can insert announcements for brands they have access to" 
    ON public.announcements FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            -- Brand owner can create announcements
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            -- Users with editor access can create announcements
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "Users can update their own announcements" 
    ON public.announcements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own announcements" 
    ON public.announcements FOR DELETE
    USING (auth.uid() = user_id);

-- Create new brand-aware RLS policies for issues
CREATE POLICY "Users can view issues for brands they have access to" 
    ON public.issues FOR SELECT
    USING (
        -- Brand owner can see all issues for their brand
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        -- Users with shared access can see issues for shared brands
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "Users can insert issues for brands they have access to" 
    ON public.issues FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            -- Brand owner can create issues
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            -- Users with editor access can create issues
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "Users can update their own issues or assigned issues" 
    ON public.issues FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own issues" 
    ON public.issues FOR DELETE
    USING (auth.uid() = user_id);

-- Create new brand-aware RLS policies for todos
CREATE POLICY "Users can view todos for brands they have access to" 
    ON public.todos FOR SELECT
    USING (
        -- Brand owner can see all todos for their brand
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
        OR
        -- Users with shared access can see todos for shared brands
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

CREATE POLICY "Users can insert todos for brands they have access to" 
    ON public.todos FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND brand_id IS NOT NULL
        AND (
            -- Brand owner can create todos
            brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
            )
            OR
            -- Users with editor access can create todos
            brand_id IN (
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND role IN ('editor', 'admin')
                AND (expires_at IS NULL OR expires_at > now())
            )
        )
    );

CREATE POLICY "Users can update their own todos or assigned todos" 
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own todos" 
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id); 