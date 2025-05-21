-- Drop existing problematic policies for organization_members
DROP POLICY IF EXISTS "Users can view members in their organizations" ON public.organization_members;

-- Create a direct SQL function to get user organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_id_param UUID)
RETURNS SETOF public.organizations
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT o.*
  FROM public.organizations o
  JOIN public.organization_members m ON m.organization_id = o.id
  WHERE m.user_id = user_id_param
  ORDER BY o.created_at DESC;
$$;

-- Create a simplified policy for organization_members
CREATE POLICY "Users can view members in organizations they belong to" 
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = organization_members.organization_id
    AND m.user_id = auth.uid()
  )
);

-- Reset the RLS cache
NOTIFY pgrst, 'reload schema'; 