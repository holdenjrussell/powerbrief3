-- Add products table and link to brands and concepts
-- This migration adds support for product management under brands

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL, -- Product identifier/SKU
    description TEXT,
    category TEXT,
    price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    image_url TEXT,
    product_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(brand_id, identifier) -- Ensure unique identifiers per brand
);

-- Add product_id to brief_concepts table
ALTER TABLE public.brief_concepts 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS products_user_id_idx ON public.products(user_id);
CREATE INDEX IF NOT EXISTS products_identifier_idx ON public.products(identifier);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS brief_concepts_product_id_idx ON public.brief_concepts(product_id);

-- Add trigger to update updated_at column automatically
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
CREATE POLICY "Users can view products for their brands" 
    ON public.products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = products.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert products for their brands" 
    ON public.products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = products.brand_id 
            AND brands.user_id = auth.uid()
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Users can update products for their brands" 
    ON public.products FOR UPDATE
    USING (
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