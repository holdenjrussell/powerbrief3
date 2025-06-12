-- Migration: Fix team sync data integrity issues
-- Date: 2025-01-30
-- Description: Clean up orphaned records and fix foreign key constraints

-- 1. Clean up orphaned records in brand_shares that reference non-existent users
DELETE FROM public.brand_shares 
WHERE shared_with_user_id IS NOT NULL 
AND shared_with_user_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

DELETE FROM public.brand_shares 
WHERE shared_by_user_id IS NOT NULL 
AND shared_by_user_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

-- 2. Clean up orphaned records in todos that reference non-existent users
DELETE FROM public.todos 
WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

UPDATE public.todos 
SET assignee_id = NULL 
WHERE assignee_id IS NOT NULL 
AND assignee_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

-- 3. Clean up orphaned records in issues that reference non-existent users
DELETE FROM public.issues 
WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

UPDATE public.issues 
SET assignee_id = NULL 
WHERE assignee_id IS NOT NULL 
AND assignee_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

-- 4. Clean up orphaned records in announcements that reference non-existent users
DELETE FROM public.announcements 
WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE id IS NOT NULL
);

-- 5. Now safely add the foreign key constraints if they don't exist
DO $$ BEGIN
    -- Brand shares constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'brand_shares_shared_with_user_id_fkey'
    ) THEN
        ALTER TABLE public.brand_shares 
        ADD CONSTRAINT brand_shares_shared_with_user_id_fkey 
        FOREIGN KEY (shared_with_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'brand_shares_shared_by_user_id_fkey'
    ) THEN
        ALTER TABLE public.brand_shares 
        ADD CONSTRAINT brand_shares_shared_by_user_id_fkey 
        FOREIGN KEY (shared_by_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Todos constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'todos_user_id_fkey'
    ) THEN
        ALTER TABLE public.todos 
        ADD CONSTRAINT todos_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'todos_assignee_id_fkey'
    ) THEN
        ALTER TABLE public.todos 
        ADD CONSTRAINT todos_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Issues constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_user_id_fkey'
    ) THEN
        ALTER TABLE public.issues 
        ADD CONSTRAINT issues_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_assignee_id_fkey'
    ) THEN
        ALTER TABLE public.issues 
        ADD CONSTRAINT issues_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Announcements constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'announcements_user_id_fkey'
    ) THEN
        ALTER TABLE public.announcements 
        ADD CONSTRAINT announcements_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Create indexes for better performance if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_shares_shared_with_user_id ON public.brand_shares(shared_with_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_shares_shared_by_user_id ON public.brand_shares(shared_by_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todos_assignee_id ON public.todos(assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_user_id ON public.issues(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_user_id ON public.announcements(user_id); 