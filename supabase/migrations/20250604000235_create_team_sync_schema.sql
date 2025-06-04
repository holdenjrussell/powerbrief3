-- Create Team Sync schema
-- This migration creates the necessary tables for Team Sync functionality

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create issues table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT DEFAULT 'short_term' CHECK (issue_type IN ('short_term', 'long_term')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    priority_order INTEGER DEFAULT 0,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create todos table
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create issue_todos relationship table (for linking issues to todos)
CREATE TABLE IF NOT EXISTS public.issue_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(issue_id, todo_id)
);

-- Create todo_issues relationship table (for linking todos to issues)
CREATE TABLE IF NOT EXISTS public.todo_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(todo_id, issue_id)
);

-- Add triggers to update updated_at column automatically
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_issues_updated_at ON public.issues;
CREATE TRIGGER update_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_todos_updated_at ON public.todos;
CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on tables
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_issues ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements table
CREATE POLICY "Users can view all announcements" 
    ON public.announcements FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own announcements" 
    ON public.announcements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own announcements" 
    ON public.announcements FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own announcements" 
    ON public.announcements FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for issues table
CREATE POLICY "Users can view all issues" 
    ON public.issues FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own issues" 
    ON public.issues FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own issues or assigned issues" 
    ON public.issues FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own issues" 
    ON public.issues FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for todos table
CREATE POLICY "Users can view all todos" 
    ON public.todos FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own todos" 
    ON public.todos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos or assigned todos" 
    ON public.todos FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete their own todos" 
    ON public.todos FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for relationship tables
CREATE POLICY "Users can view all issue_todos relationships" 
    ON public.issue_todos FOR SELECT
    USING (true);

CREATE POLICY "Users can create issue_todos relationships for their issues" 
    ON public.issue_todos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.issues 
            WHERE id = issue_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete issue_todos relationships for their issues" 
    ON public.issue_todos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.issues 
            WHERE id = issue_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view all todo_issues relationships" 
    ON public.todo_issues FOR SELECT
    USING (true);

CREATE POLICY "Users can create todo_issues relationships for their todos" 
    ON public.todo_issues FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.todos 
            WHERE id = todo_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete todo_issues relationships for their todos" 
    ON public.todo_issues FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.todos 
            WHERE id = todo_id AND user_id = auth.uid()
        )
    );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS announcements_user_id_idx ON public.announcements(user_id);
CREATE INDEX IF NOT EXISTS announcements_priority_idx ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON public.announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS issues_user_id_idx ON public.issues(user_id);
CREATE INDEX IF NOT EXISTS issues_assignee_id_idx ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS issues_status_idx ON public.issues(status);
CREATE INDEX IF NOT EXISTS issues_issue_type_idx ON public.issues(issue_type);
CREATE INDEX IF NOT EXISTS issues_priority_order_idx ON public.issues(priority_order);
CREATE INDEX IF NOT EXISTS issues_created_at_idx ON public.issues(created_at DESC);

CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS todos_assignee_id_idx ON public.todos(assignee_id);
CREATE INDEX IF NOT EXISTS todos_completed_idx ON public.todos(completed);
CREATE INDEX IF NOT EXISTS todos_due_date_idx ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS todos_priority_idx ON public.todos(priority);
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON public.todos(created_at DESC);

CREATE INDEX IF NOT EXISTS issue_todos_issue_id_idx ON public.issue_todos(issue_id);
CREATE INDEX IF NOT EXISTS issue_todos_todo_id_idx ON public.issue_todos(todo_id);

CREATE INDEX IF NOT EXISTS todo_issues_todo_id_idx ON public.todo_issues(todo_id);
CREATE INDEX IF NOT EXISTS todo_issues_issue_id_idx ON public.todo_issues(issue_id); 