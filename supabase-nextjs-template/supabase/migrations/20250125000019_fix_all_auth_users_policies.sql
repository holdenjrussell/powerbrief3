-- Fix all RLS policies that access auth.users
-- This completely removes auth.users dependencies from all policies

-- Drop and recreate brand_shares policies without auth.users access
DROP POLICY IF EXISTS "Users can view their brand shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Users can update relevant shares" ON public.brand_shares;

-- Recreate view policy without auth.users
CREATE POLICY "Users can view their brand shares" 
    ON public.brand_shares FOR SELECT
    USING (
        auth.uid() = shared_by_user_id OR 
        auth.uid() = shared_with_user_id
    );

-- Recreate update policy without auth.users
CREATE POLICY "Users can update relevant shares" 
    ON public.brand_shares FOR UPDATE
    USING (
        auth.uid() = shared_by_user_id OR 
        auth.uid() = shared_with_user_id
    );

-- Also add a policy for users to view shares by email (for pending invitations)
CREATE POLICY "Users can view pending shares by email" 
    ON public.brand_shares FOR SELECT
    USING (
        status = 'pending' AND
        shared_with_email IN (
            SELECT email FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Update the foreign key constraints to not cascade delete from auth.users
-- First drop the existing constraints
ALTER TABLE public.brand_shares 
    DROP CONSTRAINT IF EXISTS brand_shares_shared_by_user_id_fkey,
    DROP CONSTRAINT IF EXISTS brand_shares_shared_with_user_id_fkey;

-- Recreate without auth.users reference
-- Note: We'll rely on application logic to ensure these IDs are valid
ALTER TABLE public.brand_shares 
    ADD CONSTRAINT brand_shares_shared_by_user_id_check 
        CHECK (shared_by_user_id IS NOT NULL),
    ADD CONSTRAINT brand_shares_shared_with_user_id_check 
        CHECK (true); -- Allow NULL for pending invitations 