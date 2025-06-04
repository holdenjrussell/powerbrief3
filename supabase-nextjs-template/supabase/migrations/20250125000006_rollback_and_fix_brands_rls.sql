-- URGENT: Rollback and fix brands RLS policies
-- This restores full CRUD access for brand owners

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view brands they have access to" ON public.brands;

-- Create a simple policy that ensures owners can ALWAYS see their brands
CREATE POLICY "Users can view their own brands and shared brands" 
    ON public.brands FOR SELECT
    USING (
        auth.uid() = user_id  -- Owner can always see their brands
    );

-- Ensure users can create brands
DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
CREATE POLICY "Users can create brands" 
    ON public.brands FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

-- Ensure users can update their own brands
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Ensure users can delete their own brands
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (
        auth.uid() = user_id
    ); 