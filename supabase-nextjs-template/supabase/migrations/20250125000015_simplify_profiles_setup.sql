-- Simplify profiles setup to avoid auth.users permission issues
-- This migration ensures profiles work without direct auth.users access

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_existing_users_to_profiles() CASCADE;

-- Create a simpler INSERT policy for profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Update the accept_brand_share_invitation function to handle profile creation
CREATE OR REPLACE FUNCTION public.accept_brand_share_invitation(p_invitation_token UUID)
RETURNS JSONB AS $$
DECLARE
    v_share RECORD;
    v_user_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    
    -- Get user email from auth.jwt()
    v_user_email := current_setting('request.jwt.claims', true)::json->>'email';
    
    IF v_user_email IS NULL THEN
        -- Fallback: try to get from auth.email()
        v_user_email := auth.email();
    END IF;
    
    -- Find the share by invitation token
    SELECT * INTO v_share
    FROM public.brand_shares
    WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if the invitation is for this user's email
    IF v_share.shared_with_email != v_user_email THEN
        RETURN jsonb_build_object('success', false, 'error', 'This invitation is for a different email address');
    END IF;
    
    -- Ensure user has a profile (create if not exists)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, v_user_email, split_part(v_user_email, '@', 1))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
    
    -- Update the share record
    UPDATE public.brand_shares
    SET 
        shared_with_user_id = v_user_id,
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_brand_share_invitation TO authenticated; 