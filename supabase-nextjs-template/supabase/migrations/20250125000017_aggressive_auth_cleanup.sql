-- Aggressive cleanup to completely remove all auth.users dependencies
-- This will disable all RLS policies temporarily and rebuild them without auth.users access

-- Disable RLS temporarily to make changes
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_shares DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on profiles and brand_shares
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- Drop all brand_shares policies
DROP POLICY IF EXISTS "Users can view brand shares they created" ON public.brand_shares;
DROP POLICY IF EXISTS "Users can view brand shares for them" ON public.brand_shares;
DROP POLICY IF EXISTS "Users can create brand shares" ON public.brand_shares;
DROP POLICY IF EXISTS "Users can update brand shares they created" ON public.brand_shares;
DROP POLICY IF EXISTS "Users can delete brand shares they created" ON public.brand_shares;

-- Drop all functions that might access auth.users
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_existing_users_to_profiles() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile() CASCADE;

-- Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Recreate simple RLS policies without auth.users access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Recreate brand_shares policies
ALTER TABLE public.brand_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view shares they created" ON public.brand_shares
    FOR SELECT USING (shared_by_user_id = auth.uid());

CREATE POLICY "Allow users to view shares for them" ON public.brand_shares
    FOR SELECT USING (shared_with_user_id = auth.uid());

CREATE POLICY "Allow users to create shares" ON public.brand_shares
    FOR INSERT WITH CHECK (shared_by_user_id = auth.uid());

CREATE POLICY "Allow users to update shares they created" ON public.brand_shares
    FOR UPDATE USING (shared_by_user_id = auth.uid());

CREATE POLICY "Allow users to delete shares they created" ON public.brand_shares
    FOR DELETE USING (shared_by_user_id = auth.uid());

-- Recreate the accept function without any auth.users access
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

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.brand_shares TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_brand_share_invitation TO authenticated; 