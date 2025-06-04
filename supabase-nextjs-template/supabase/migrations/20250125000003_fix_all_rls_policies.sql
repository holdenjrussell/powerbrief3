-- Comprehensive fix for all RLS policies related to brand sharing
-- This ensures all tables work correctly with the brand sharing feature

-- First, ensure the brand visibility is correct
DROP POLICY IF EXISTS "Users can view brands they have access to" ON public.brands;
DROP POLICY IF EXISTS "Users can view owned and shared brands" ON public.brands;

CREATE POLICY "Users can view brands they have access to" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand
        auth.uid() = user_id 
        OR
        -- User has accepted share access
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_id = brands.id
            AND shared_with_user_id = auth.uid()
            AND status = 'accepted'
        )
    );

-- Fix brief_batches SELECT policy
DROP POLICY IF EXISTS "Users can view their own brief batches" ON public.brief_batches;
DROP POLICY IF EXISTS "Users can view brief batches for accessible brands" ON public.brief_batches;

CREATE POLICY "Users can view brief batches for accessible brands" 
    ON public.brief_batches FOR SELECT
    USING (
        -- User created the batch
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = brief_batches.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = brands.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                )
            )
        )
    );

-- Fix brief_concepts SELECT policy
DROP POLICY IF EXISTS "Users can view their own brief concepts" ON public.brief_concepts;
DROP POLICY IF EXISTS "Users can view brief concepts for accessible brands" ON public.brief_concepts;

CREATE POLICY "Users can view brief concepts for accessible brands" 
    ON public.brief_concepts FOR SELECT
    USING (
        -- User created the concept
        auth.uid() = user_id 
        OR
        -- User has access to the brand through the batch
        EXISTS (
            SELECT 1 FROM public.brief_batches bb
            JOIN public.brands b ON b.id = bb.brand_id
            WHERE bb.id = brief_concepts.brief_batch_id
            AND (
                b.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = b.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                )
            )
        )
    );

-- Ensure products table has correct policies if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        -- Drop existing SELECT policy
        DROP POLICY IF EXISTS "Users can view products for accessible brands" ON public.products;
        
        -- Create new SELECT policy
        CREATE POLICY "Users can view products for accessible brands" 
            ON public.products FOR SELECT
            USING (
                -- User created the product
                auth.uid() = user_id 
                OR
                -- User has access to the brand
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE brands.id = products.brand_id 
                    AND (
                        brands.user_id = auth.uid() OR
                        EXISTS (
                            SELECT 1 FROM public.brand_shares
                            WHERE brand_id = brands.id
                            AND shared_with_user_id = auth.uid()
                            AND status = 'accepted'
                        )
                    )
                )
            );
    END IF;
END $$; 