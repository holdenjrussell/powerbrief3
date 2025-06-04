-- Fix get_brand_shared_users function to not access auth.users
-- This removes the last remaining auth.users dependency

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_brand_shared_users(UUID);

-- Recreate without auth.users access
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
    -- Check if the current user has access to view this brand's shares
    IF NOT EXISTS (
        SELECT 1 FROM public.brands 
        WHERE id = p_brand_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN; -- Return empty if user doesn't own the brand
    END IF;
    
    RETURN QUERY
    SELECT 
        bs.id as share_id,
        bs.shared_with_user_id as user_id,
        bs.shared_with_email as email,
        COALESCE(p.full_name, split_part(bs.shared_with_email, '@', 1)) as full_name,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_brand_shared_users(UUID) TO authenticated;

-- Also update the accept_brand_share_invitation to not use auth.users
DROP FUNCTION IF EXISTS public.accept_brand_share_invitation(UUID);

CREATE OR REPLACE FUNCTION public.accept_brand_share_invitation(p_invitation_token UUID)
RETURNS JSONB AS $$
DECLARE
    v_share RECORD;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Find the share
    SELECT * INTO v_share
    FROM public.brand_shares
    WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Update the share record
    UPDATE public.brand_shares
    SET 
        shared_with_user_id = v_current_user_id,
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_share.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'brand_id', v_share.brand_id,
        'share_id', v_share.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_brand_share_invitation(UUID) TO authenticated; 