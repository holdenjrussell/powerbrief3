-- Add brand sharing functionality
-- This migration adds support for sharing brands with other users via email

-- Create brand_shares table to track brand sharing relationships
CREATE TABLE IF NOT EXISTS public.brand_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    accepted_at TIMESTAMPTZ,
    UNIQUE(brand_id, shared_with_email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS brand_shares_brand_id_idx ON public.brand_shares(brand_id);
CREATE INDEX IF NOT EXISTS brand_shares_shared_with_user_id_idx ON public.brand_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS brand_shares_shared_with_email_idx ON public.brand_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS brand_shares_invitation_token_idx ON public.brand_shares(invitation_token);
CREATE INDEX IF NOT EXISTS brand_shares_status_idx ON public.brand_shares(status);

-- Enable RLS on brand_shares table
ALTER TABLE public.brand_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brand_shares table

-- Users can view shares where they are the sharer or the recipient
CREATE POLICY "Users can view their brand shares" 
    ON public.brand_shares FOR SELECT
    USING (
        auth.uid() = shared_by_user_id OR 
        auth.uid() = shared_with_user_id OR
        (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- Brand owners can create shares for their brands
CREATE POLICY "Brand owners can create shares" 
    ON public.brand_shares FOR INSERT
    WITH CHECK (
        auth.uid() = shared_by_user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = brand_shares.brand_id 
            AND user_id = auth.uid()
        )
    );

-- Users can update shares they created or shares sent to them (for accepting/rejecting)
CREATE POLICY "Users can update relevant shares" 
    ON public.brand_shares FOR UPDATE
    USING (
        auth.uid() = shared_by_user_id OR 
        auth.uid() = shared_with_user_id OR
        (shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- Only brand owners can delete shares
CREATE POLICY "Brand owners can delete shares" 
    ON public.brand_shares FOR DELETE
    USING (
        auth.uid() = shared_by_user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE id = brand_shares.brand_id 
            AND user_id = auth.uid()
        )
    );

-- Update brands RLS policies to include shared access

-- Drop existing view policy
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;

-- Create new view policy that includes shared brands
CREATE POLICY "Users can view owned and shared brands" 
    ON public.brands FOR SELECT
    USING (
        -- User owns the brand
        auth.uid() = user_id OR
        -- User has access through organization
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
            )
        ) OR
        -- User has access through brand sharing
        EXISTS (
            SELECT 1 FROM public.brand_shares
            WHERE brand_id = brands.id
            AND shared_with_user_id = auth.uid()
            AND status = 'accepted'
        )
    );

-- Update other brand policies to prevent shared users from modifying/deleting

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands" 
    ON public.brands FOR UPDATE
    USING (
        -- Only owners and organization admins can update
        auth.uid() = user_id OR
        (
            organization_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.organization_members 
                WHERE organization_id = brands.organization_id 
                AND user_id = auth.uid()
                AND role IN ('owner', 'admin')
            )
        )
    );

-- Keep delete policy as is (shared users cannot delete)

-- Add trigger to update updated_at column automatically
DROP TRIGGER IF EXISTS update_brand_shares_updated_at ON public.brand_shares;
CREATE TRIGGER update_brand_shares_updated_at
BEFORE UPDATE ON public.brand_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to accept brand share invitation
CREATE OR REPLACE FUNCTION public.accept_brand_share_invitation(p_invitation_token UUID)
RETURNS JSONB AS $$
DECLARE
    v_share RECORD;
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    
    -- Find the share by invitation token
    SELECT * INTO v_share
    FROM public.brand_shares
    WHERE invitation_token = p_invitation_token
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if the invitation is for this user's email
    IF v_share.shared_with_email != v_user_email THEN
        RETURN jsonb_build_object('success', false, 'error', 'This invitation is for a different email address');
    END IF;
    
    -- Update the share record
    UPDATE public.brand_shares
    SET 
        shared_with_user_id = v_user_id,
        status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    WHERE id = v_share.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'brand_id', v_share.brand_id,
        'share_id', v_share.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get shared users for a brand
CREATE OR REPLACE FUNCTION public.get_brand_shared_users(p_brand_id UUID)
RETURNS TABLE (
    share_id UUID,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    status TEXT,
    shared_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bs.id as share_id,
        bs.shared_with_user_id as user_id,
        bs.shared_with_email as email,
        COALESCE(p.full_name, bs.shared_with_email) as full_name,
        bs.role,
        bs.status,
        bs.created_at as shared_at,
        bs.accepted_at
    FROM public.brand_shares bs
    LEFT JOIN public.profiles p ON p.id = bs.shared_with_user_id
    WHERE bs.brand_id = p_brand_id
    ORDER BY bs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update brief_batches policies to include shared brand access
DROP POLICY IF EXISTS "Users can view their own brief batches" ON public.brief_batches;
CREATE POLICY "Users can view brief batches for accessible brands" 
    ON public.brief_batches FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = brief_batches.brand_id 
            AND (
                brands.user_id = auth.uid() OR
                (
                    brands.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = brands.organization_id 
                        AND user_id = auth.uid()
                    )
                ) OR
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = brands.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                )
            )
        )
    );

-- Similar updates for brief_concepts
DROP POLICY IF EXISTS "Users can view their own brief concepts" ON public.brief_concepts;
CREATE POLICY "Users can view brief concepts for accessible brands" 
    ON public.brief_concepts FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brief_batches bb
            JOIN public.brands b ON b.id = bb.brand_id
            WHERE bb.id = brief_concepts.brief_batch_id
            AND (
                b.user_id = auth.uid() OR
                (
                    b.organization_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.organization_members 
                        WHERE organization_id = b.organization_id 
                        AND user_id = auth.uid()
                    )
                ) OR
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_id = b.id
                    AND shared_with_user_id = auth.uid()
                    AND status = 'accepted'
                )
            )
        )
    );

-- Add comments to document the new structure
COMMENT ON TABLE public.brand_shares IS 'Tracks brand sharing relationships between users';
COMMENT ON COLUMN public.brand_shares.role IS 'Role of the shared user: viewer (read-only) or editor (full access except delete)';
COMMENT ON COLUMN public.brand_shares.status IS 'Status of the share invitation: pending, accepted, or rejected';
COMMENT ON COLUMN public.brand_shares.invitation_token IS 'Unique token used to accept the invitation'; 