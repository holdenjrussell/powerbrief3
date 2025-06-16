-- Temporarily disable RLS on brand_n8n_workflows to test the issue
-- This will help us determine if the problem is with the RLS policies or something else

-- Disable RLS temporarily
ALTER TABLE public.brand_n8n_workflows DISABLE ROW LEVEL SECURITY; 