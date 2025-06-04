-- Fix RLS policies for products table
-- This ensures products are accessible based on brand access

-- First check if products table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        -- Enable RLS on products table if not already enabled
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        
        -- Drop all existing policies
        DROP POLICY IF EXISTS "Users can view products for accessible brands" ON public.products;
        DROP POLICY IF EXISTS "Users can create products for their brands" ON public.products;
        DROP POLICY IF EXISTS "Users can update products for their brands" ON public.products;
        DROP POLICY IF EXISTS "Users can delete products for their brands" ON public.products;
        
        -- Create SELECT policy
        CREATE POLICY "Users can view products for accessible brands" 
            ON public.products FOR SELECT
            USING (
                -- User created the product
                auth.uid() = user_id 
                OR
                -- User has access to the brand (owner or shared)
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
        
        -- Create INSERT policy (only brand owners can create products)
        CREATE POLICY "Users can create products for their brands" 
            ON public.products FOR INSERT
            WITH CHECK (
                auth.uid() = user_id 
                AND
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE brands.id = brand_id 
                    AND brands.user_id = auth.uid()
                )
            );
        
        -- Create UPDATE policy (only brand owners can update products)
        CREATE POLICY "Users can update products for their brands" 
            ON public.products FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE brands.id = products.brand_id 
                    AND brands.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE brands.id = products.brand_id 
                    AND brands.user_id = auth.uid()
                )
            );
        
        -- Create DELETE policy (only brand owners can delete products)
        CREATE POLICY "Users can delete products for their brands" 
            ON public.products FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE brands.id = products.brand_id 
                    AND brands.user_id = auth.uid()
                )
            );
    END IF;
END $$; 