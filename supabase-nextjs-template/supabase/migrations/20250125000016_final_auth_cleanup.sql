-- Final cleanup to remove any remaining auth.users dependencies
-- This ensures brand sharing works without auth.users access

-- Drop any remaining problematic functions or triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_existing_users_to_profiles() CASCADE;

-- Ensure brand_shares table has proper permissions
GRANT ALL ON public.brand_shares TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Ensure profiles table has proper permissions  
GRANT ALL ON public.profiles TO authenticated, anon;

-- Create a simple function to create profiles without auth.users access
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void AS $$
DECLARE
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    current_user_id := auth.uid();
    
    -- Try to get email from JWT claims
    BEGIN
        current_user_email := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION WHEN OTHERS THEN
        current_user_email := auth.email();
    END;
    
    IF current_user_id IS NOT NULL AND current_user_email IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (
            current_user_id, 
            current_user_email, 
            split_part(current_user_email, '@', 1)
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated; 