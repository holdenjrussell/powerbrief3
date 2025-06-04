-- Fix RLS policies for brand sharing
-- This migration ensures brands remain visible to their owners even with pending shares

-- First, let's check and create missing RLS policies for brands table
-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Users can view owned and shared brands" ON public.brands;

-- Create a better policy that ensures owners always see their brands
CREATE POLICY "Users can view owned and shared brands" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand (this should ALWAYS work)
        auth.uid() = user_id OR
        -- User has access through organization (optional - may not exist)
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
            )
        ) OR
        -- User has access through ACCEPTED brand sharing
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_id = brands.id
            AND shared_with_user_id = auth.uid()
            AND status = 'accepted'
        )
    );

-- Ensure INSERT policy exists for brands
DROP POLICY IF EXISTS "Users can create brands" ON public.brands;
CREATE POLICY "Users can create brands" 
    ON public.brands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure DELETE policy exists for brands
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands" 
    ON public.brands FOR DELETE
    USING (auth.uid() = user_id);

-- Fix brief_batches policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create brief batches for their brands" ON public.brief_batches;
DROP POLICY IF EXISTS "Users can update accessible brief batches" ON public.brief_batches;
DROP POLICY IF EXISTS "Users can delete their own brief batches" ON public.brief_batches;

-- Ensure users can create batches for their brands
CREATE POLICY "Users can create brief batches for their brands" 
    ON public.brief_batches FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = brief_batches.brand_id 
            AND (
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = brands.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                    AND role = 'editor'
                )
            )
        )
    );

-- Ensure users can update their own batches or batches in shared brands (if editor)
CREATE POLICY "Users can update accessible brief batches" 
    ON public.brief_batches FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands b
            JOIN public.brand_shares bs ON bs.brand_id = b.id
            WHERE b.id = brief_batches.brand_id
            AND bs.shared_with_user_id = auth.uid()
            AND bs.status = 'accepted'
            AND bs.role = 'editor'
        )
    );

-- Ensure users can delete their own batches
CREATE POLICY "Users can delete their own brief batches" 
    ON public.brief_batches FOR DELETE
    USING (auth.uid() = user_id);

-- Fix brief_concepts policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create brief concepts" ON public.brief_concepts;
DROP POLICY IF EXISTS "Users can update accessible brief concepts" ON public.brief_concepts;
DROP POLICY IF EXISTS "Users can delete their own brief concepts" ON public.brief_concepts;

-- Ensure users can create concepts
CREATE POLICY "Users can create brief concepts" 
    ON public.brief_concepts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
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
                    AND role = 'editor'
                )
            )
        )
    );

-- Ensure users can update accessible concepts
CREATE POLICY "Users can update accessible brief concepts" 
    ON public.brief_concepts FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brief_batches bb
            JOIN public.brands b ON b.id = bb.brand_id
            JOIN public.brand_shares bs ON bs.brand_id = b.id
            WHERE bb.id = brief_concepts.brief_batch_id
            AND bs.shared_with_user_id = auth.uid()
            AND bs.status = 'accepted'
            AND bs.role = 'editor'
        )
    );

-- Ensure users can delete their own concepts
CREATE POLICY "Users can delete their own brief concepts" 
    ON public.brief_concepts FOR DELETE
    USING (auth.uid() = user_id);

-- Add RLS policies for products table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        -- Enable RLS on products
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies first
        DROP POLICY IF EXISTS "Users can view products for accessible brands" ON public.products;
        DROP POLICY IF EXISTS "Users can create products for their brands" ON public.products;
        DROP POLICY IF EXISTS "Users can update products for accessible brands" ON public.products;
        DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
        
        -- View policy
        CREATE POLICY "Users can view products for accessible brands" 
            ON public.products FOR SELECT
            USING (
                auth.uid() = user_id OR
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
        
        -- Insert policy
        CREATE POLICY "Users can create products for their brands" 
            ON public.products FOR INSERT
            WITH CHECK (
                auth.uid() = user_id AND
                EXISTS (
                    SELECT 1 FROM public.brands 
                    WHERE id = products.brand_id 
                    AND (
                        user_id = auth.uid() OR
                        EXISTS (
                            SELECT 1 FROM public.brand_shares
                            WHERE brand_id = brands.id
                            AND shared_with_user_id = auth.uid()
                            AND status = 'accepted'
                            AND role = 'editor'
                        )
                    )
                )
            );
        
        -- Update policy
        CREATE POLICY "Users can update products for accessible brands" 
            ON public.products FOR UPDATE
            USING (
                auth.uid() = user_id OR
                EXISTS (
                    SELECT 1 FROM public.brands b
                    JOIN public.brand_shares bs ON bs.brand_id = b.id
                    WHERE b.id = products.brand_id
                    AND bs.shared_with_user_id = auth.uid()
                    AND bs.status = 'accepted'
                    AND bs.role = 'editor'
                )
            );
        
        -- Delete policy
        CREATE POLICY "Users can delete their own products" 
            ON public.products FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Grant execute permissions on RPC functions if they exist
DO $$
BEGIN
    -- Check if functions exist before granting permissions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_brand_share_invitation') THEN
        GRANT EXECUTE ON FUNCTION public.accept_brand_share_invitation(UUID) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_brand_shared_users') THEN
        GRANT EXECUTE ON FUNCTION public.get_brand_shared_users(UUID) TO authenticated;
    END IF;
END $$;

-- Add a helpful function to check if a user can edit a brand
CREATE OR REPLACE FUNCTION public.can_user_edit_brand(p_brand_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.brands
        WHERE id = p_brand_id
        AND user_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM public.brand_shares
        WHERE brand_id = p_brand_id
        AND shared_with_user_id = p_user_id
        AND status = 'accepted'
        AND role = 'editor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_user_edit_brand(UUID, UUID) TO authenticated;

-- Add a function to get all brands accessible to a user (owned + shared)
CREATE OR REPLACE FUNCTION public.get_user_accessible_brands(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    name TEXT,
    user_id UUID,
    access_type TEXT, -- 'owner' or 'shared'
    role TEXT, -- null for owner, 'viewer' or 'editor' for shared
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    -- Get owned brands
    SELECT 
        b.id,
        b.name,
        b.user_id,
        'owner'::TEXT as access_type,
        NULL::TEXT as role,
        b.created_at,
        b.updated_at
    FROM public.brands b
    WHERE b.user_id = p_user_id
    
    UNION ALL
    
    -- Get shared brands
    SELECT 
        b.id,
        b.name,
        b.user_id,
        'shared'::TEXT as access_type,
        bs.role,
        b.created_at,
        b.updated_at
    FROM public.brands b
    JOIN public.brand_shares bs ON bs.brand_id = b.id
    WHERE bs.shared_with_user_id = p_user_id
    AND bs.status = 'accepted'
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_brands(UUID) TO authenticated; 