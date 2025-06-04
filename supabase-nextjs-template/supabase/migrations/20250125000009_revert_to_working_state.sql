-- Revert to working state (same as first rollback that worked)
-- This ensures owners can see and manage their brands

-- Drop all policies that might exist
DROP POLICY IF EXISTS "Users can view their own brands and shared brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
DROP POLICY IF EXISTS "Users can update their own brands or shared brands with editor role" ON public.brands;
DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;

-- Create simple policies that ensure owners have full access
CREATE POLICY "Users can view their own brands and shared brands" 
    ON public.brands FOR SELECT
    USING (
        auth.uid() = user_id  -- Owner can always see their brands
    );

CREATE POLICY "Users can create brands" 
    ON public.brands FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (
        auth.uid() = user_id
    ); 