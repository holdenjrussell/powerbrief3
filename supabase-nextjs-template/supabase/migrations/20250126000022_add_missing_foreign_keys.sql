-- Migration: Add missing foreign key constraints for team-sync functionality
-- Date: 2025-01-26

-- Add foreign key constraints for user relationships

-- 1. Add foreign key for todos.user_id -> profiles.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'todos_user_id_fkey'
    ) THEN
        ALTER TABLE todos 
        ADD CONSTRAINT todos_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add foreign key for todos.assignee_id -> profiles.id
DO $$ BEGIN
    -- First add the assignee_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'todos' AND column_name = 'assignee_id'
    ) THEN
        ALTER TABLE todos ADD COLUMN assignee_id UUID;
    END IF;
    
    -- Then add the foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'todos_assignee_id_fkey'
    ) THEN
        ALTER TABLE todos 
        ADD CONSTRAINT todos_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add foreign key for announcements.user_id -> profiles.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'announcements_user_id_fkey'
    ) THEN
        ALTER TABLE announcements 
        ADD CONSTRAINT announcements_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Add foreign key for issues.user_id -> profiles.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_user_id_fkey'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT issues_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Add foreign key for issues.assignee_id -> profiles.id (if column exists)
DO $$ BEGIN
    -- First add the assignee_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'issues' AND column_name = 'assignee_id'
    ) THEN
        ALTER TABLE issues ADD COLUMN assignee_id UUID;
    END IF;
    
    -- Then add the foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_assignee_id_fkey'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT issues_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Add foreign key for brand_shares.shared_with_user_id -> profiles.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'brand_shares_shared_with_user_id_fkey'
    ) THEN
        ALTER TABLE brand_shares 
        ADD CONSTRAINT brand_shares_shared_with_user_id_fkey 
        FOREIGN KEY (shared_with_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Add foreign key for brand_shares.shared_by_user_id -> profiles.id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'brand_shares_shared_by_user_id_fkey'
    ) THEN
        ALTER TABLE brand_shares 
        ADD CONSTRAINT brand_shares_shared_by_user_id_fkey 
        FOREIGN KEY (shared_by_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance on foreign key columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_todos_assignee_id ON todos(assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_user_id ON announcements(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_shares_shared_with_user_id ON brand_shares(shared_with_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_shares_shared_by_user_id ON brand_shares(shared_by_user_id); 