-- Add brand_id to Team Sync tables
-- This migration adds brand_id to announcements, issues, and todos tables
-- to make them brand-specific

-- Add brand_id column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add brand_id column to issues table
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add brand_id column to todos table
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- Create indexes for brand_id columns
CREATE INDEX IF NOT EXISTS announcements_brand_id_idx ON public.announcements(brand_id);
CREATE INDEX IF NOT EXISTS issues_brand_id_idx ON public.issues(brand_id);
CREATE INDEX IF NOT EXISTS todos_brand_id_idx ON public.todos(brand_id);

-- Update RLS policies to include brand filtering

-- Drop existing policies for announcements
DROP POLICY IF EXISTS "Users can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can insert their own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can update their own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can delete their own announcements" ON public.announcements;

-- Create new policies for announcements with brand filtering
CREATE POLICY "Users can view announcements for brands they have access to" 
    ON public.announcements FOR SELECT
    USING (
        brand_id IS NULL -- Allow viewing global announcements
        OR EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = announcements.brand_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert announcements for their brands" 
    ON public.announcements FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            brand_id IS NULL -- Allow creating global announcements
            OR EXISTS (
                SELECT 1 FROM public.brands 
                WHERE id = brand_id 
                AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own announcements" 
    ON public.announcements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own announcements" 
    ON public.announcements FOR DELETE
    USING (auth.uid() = user_id);

-- Drop existing policies for issues
DROP POLICY IF EXISTS "Users can view all issues" ON public.issues;
DROP POLICY IF EXISTS "Users can insert their own issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update their own issues or assigned issues" ON public.issues;
DROP POLICY IF EXISTS "Users can delete their own issues" ON public.issues;

-- Create new policies for issues with brand filtering
CREATE POLICY "Users can view issues for brands they have access to" 
    ON public.issues FOR SELECT
    USING (
        brand_id IS NULL -- Allow viewing global issues
        OR EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = issues.brand_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert issues for their brands" 
    ON public.issues FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            brand_id IS NULL -- Allow creating global issues
            OR EXISTS (
                SELECT 1 FROM public.brands 
                WHERE id = brand_id 
                AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own issues or assigned issues" 
    ON public.issues FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own issues" 
    ON public.issues FOR DELETE
    USING (auth.uid() = user_id);

-- Drop existing policies for todos
DROP POLICY IF EXISTS "Users can view all todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

-- Create new policies for todos with brand filtering
CREATE POLICY "Users can view todos for brands they have access to" 
    ON public.todos FOR SELECT
    USING (
        brand_id IS NULL -- Allow viewing global todos
        OR EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = todos.brand_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert todos for their brands" 
    ON public.todos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            brand_id IS NULL -- Allow creating global todos
            OR EXISTS (
                SELECT 1 FROM public.brands 
                WHERE id = brand_id 
                AND user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own todos or assigned todos" 
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own todos" 
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id);

-- Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS announcements_brand_user_idx ON public.announcements(brand_id, user_id);
CREATE INDEX IF NOT EXISTS issues_brand_user_idx ON public.issues(brand_id, user_id);
CREATE INDEX IF NOT EXISTS todos_brand_user_idx ON public.todos(brand_id, user_id);

-- Add comment to explain the brand_id column
COMMENT ON COLUMN public.announcements.brand_id IS 'Reference to the brand this announcement belongs to. NULL for global announcements.';
COMMENT ON COLUMN public.issues.brand_id IS 'Reference to the brand this issue belongs to. NULL for global issues.';
COMMENT ON COLUMN public.todos.brand_id IS 'Reference to the brand this todo belongs to. NULL for global todos.'; 