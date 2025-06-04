-- Create products table if it doesn't exist
-- This ensures the products feature works properly

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    identifier TEXT,
    description TEXT,
    category TEXT,
    price DECIMAL(10,2),
    msrp DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    image_url TEXT,
    product_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view products for their brands" ON public.products;
DROP POLICY IF EXISTS "Users can create products for their brands" ON public.products;
DROP POLICY IF EXISTS "Users can update products for their brands" ON public.products;
DROP POLICY IF EXISTS "Users can delete products for their brands" ON public.products;

-- Create simple policies for brand owners
CREATE POLICY "Users can view products for their brands" 
    ON public.products FOR SELECT
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = products.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create products for their brands" 
    ON public.products FOR INSERT
    WITH CHECK (
        -- User must own the brand and be the one creating the product
        auth.uid() = user_id 
        AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = brand_id 
            AND brands.user_id = auth.uid()
        )
    );

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

CREATE POLICY "Users can delete products for their brands" 
    ON public.products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = products.brand_id 
            AND brands.user_id = auth.uid()
        )
    ); 