-- Add MSRP and Sale Price columns to products table
-- This migration adds support for MSRP and Sale Price fields and makes SKU/identifier optional

-- Add new pricing columns
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS msrp DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);

-- Make identifier column optional by removing NOT NULL constraint if it exists
ALTER TABLE public.products ALTER COLUMN identifier DROP NOT NULL;

-- Update the unique constraint to handle NULL identifiers properly
-- Drop existing unique constraint if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_brand_id_identifier_key;

-- Create new unique constraint that allows NULL identifiers but prevents duplicate non-null identifiers per brand
CREATE UNIQUE INDEX IF NOT EXISTS products_brand_id_identifier_unique 
ON public.products (brand_id, identifier) 
WHERE identifier IS NOT NULL; 