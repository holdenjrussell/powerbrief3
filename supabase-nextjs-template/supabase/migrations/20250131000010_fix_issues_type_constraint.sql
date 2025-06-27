-- Fix issues table constraint to allow new issue types
ALTER TABLE public.issues 
DROP CONSTRAINT IF EXISTS issues_issue_type_check;

ALTER TABLE public.issues 
ADD CONSTRAINT issues_issue_type_check 
CHECK (issue_type IN ('short_term', 'long_term', 'bug', 'feature', 'improvement', 'question'));

-- Update any existing 'short_term' issues to 'improvement' to match the UI
UPDATE public.issues 
SET issue_type = 'improvement' 
WHERE issue_type = 'short_term';

-- Update any existing 'long_term' issues to 'feature' to match the UI
UPDATE public.issues 
SET issue_type = 'feature' 
WHERE issue_type = 'long_term'; 