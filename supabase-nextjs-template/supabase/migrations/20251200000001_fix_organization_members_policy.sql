-- Fix infinite recursion in organization_members RLS policy
DROP POLICY IF EXISTS "Users can view members in their organizations" ON public.organization_members;

CREATE POLICY "Users can view members in their organizations" 
    ON public.organization_members FOR SELECT
    USING (
        -- Fixed policy to avoid recursive self-reference
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    ); 