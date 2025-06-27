-- Fix contract templates and contracts RLS policies to support brand sharing
-- This allows users with shared brand access to view and manage contracts/templates

-- ============================================
-- CONTRACT TEMPLATES RLS POLICIES
-- ============================================

-- Drop existing contract_templates policies
DROP POLICY IF EXISTS "Users can view their own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Users can insert their own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Users can update their own contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Users can delete their own contract templates" ON public.contract_templates;

-- Create new SELECT policy that includes brand sharing
CREATE POLICY "Users can view contract templates for accessible brands" 
    ON public.contract_templates FOR SELECT
    USING (
        -- User created the template
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contract_templates.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has shared access to the brand (viewer or editor)
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- Create new INSERT policy that allows users with editor access to create templates
CREATE POLICY "Users can create contract templates for brands they can edit" 
    ON public.contract_templates FOR INSERT
    WITH CHECK (
        -- User is creating template for themselves
        auth.uid() = user_id 
        AND
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contract_templates.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create new UPDATE policy that allows users with editor access to update templates
CREATE POLICY "Users can update contract templates for brands they can edit" 
    ON public.contract_templates FOR UPDATE
    USING (
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contract_templates.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create new DELETE policy that allows brand owners and editors to delete templates
CREATE POLICY "Users can delete contract templates for brands they can edit" 
    ON public.contract_templates FOR DELETE
    USING (
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contract_templates.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- ============================================
-- CONTRACTS RLS POLICIES
-- ============================================

-- Drop existing contracts policies
DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
-- Keep the public share token policy as is
-- DROP POLICY IF EXISTS "Anyone can view contracts with valid share token" ON public.contracts;

-- Create new SELECT policy that includes brand sharing
CREATE POLICY "Users can view contracts for accessible brands" 
    ON public.contracts FOR SELECT
    USING (
        -- User created the contract
        auth.uid() = user_id 
        OR
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contracts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has shared access to the brand (viewer or editor)
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- Create new INSERT policy that allows users with editor access to create contracts
CREATE POLICY "Users can create contracts for brands they can edit" 
    ON public.contracts FOR INSERT
    WITH CHECK (
        -- User is creating contract for themselves
        auth.uid() = user_id 
        AND
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contracts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create new UPDATE policy that allows users with editor access to update contracts
CREATE POLICY "Users can update contracts for brands they can edit" 
    ON public.contracts FOR UPDATE
    USING (
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contracts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Create new DELETE policy that allows brand owners and editors to delete contracts
CREATE POLICY "Users can delete contracts for brands they can edit" 
    ON public.contracts FOR DELETE
    USING (
        -- User has edit access to the brand
        EXISTS (
            SELECT 1 FROM brands 
            WHERE brands.id = contracts.brand_id 
            AND (
                -- User owns the brand
                brands.user_id = auth.uid() 
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- ============================================
-- CONTRACT TEMPLATE FIELDS RLS POLICIES
-- ============================================

-- Also update contract_template_fields policies if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contract_template_fields'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view fields of their templates" ON public.contract_template_fields;
        DROP POLICY IF EXISTS "Users can insert fields for their templates" ON public.contract_template_fields;
        DROP POLICY IF EXISTS "Users can update fields of their templates" ON public.contract_template_fields;
        DROP POLICY IF EXISTS "Users can delete fields of their templates" ON public.contract_template_fields;

        -- Create new policies with brand sharing support
        CREATE POLICY "Users can view template fields for accessible brands" 
            ON public.contract_template_fields FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.contract_templates ct
                    JOIN public.brands b ON b.id = ct.brand_id
                    WHERE ct.id = contract_template_fields.template_id
                    AND (
                        -- User owns the brand
                        b.user_id = auth.uid() 
                        OR
                        -- User has shared access to the brand
                        EXISTS (
                            SELECT 1 FROM brand_shares
                            WHERE brand_shares.brand_id = b.id
                            AND brand_shares.shared_with_user_id = auth.uid()
                            AND brand_shares.status = 'accepted'
                        )
                    )
                )
            );

        CREATE POLICY "Users can manage template fields for brands they can edit" 
            ON public.contract_template_fields FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.contract_templates ct
                    JOIN public.brands b ON b.id = ct.brand_id
                    WHERE ct.id = contract_template_fields.template_id
                    AND (
                        -- User owns the brand
                        b.user_id = auth.uid() 
                        OR
                        -- User has editor access to the brand
                        EXISTS (
                            SELECT 1 FROM brand_shares
                            WHERE brand_shares.brand_id = b.id
                            AND brand_shares.shared_with_user_id = auth.uid()
                            AND brand_shares.status = 'accepted'
                            AND brand_shares.role = 'editor'
                        )
                    )
                )
            );
    END IF;
END $$;

-- Add comments to document the changes
COMMENT ON TABLE public.contract_templates IS 'Stores contract templates for brands. Accessible by brand owners and users with shared brand access.';
COMMENT ON TABLE public.contracts IS 'Stores contract instances for brands. Accessible by brand owners and users with shared brand access.'; 