-- Fix the is_user_authenticated function to properly handle basic authentication
CREATE OR REPLACE FUNCTION public.is_user_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Check if the user is authenticated at all (basic check)
  SELECT auth.role() = 'authenticated';
$$; 