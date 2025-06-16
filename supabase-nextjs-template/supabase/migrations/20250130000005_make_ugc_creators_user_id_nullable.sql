-- Make user_id nullable in ugc_creators table
-- This allows creators to exist before they have user accounts
-- They can create accounts later and be linked to their creator profile

-- Drop the NOT NULL constraint on user_id
ALTER TABLE public.ugc_creators 
ALTER COLUMN user_id DROP NOT NULL;

-- Update existing records with NULL user_id to have a temporary placeholder
-- (Only if there are any records with invalid user_ids)
-- UPDATE public.ugc_creators 
-- SET user_id = NULL 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add a comment explaining the change
COMMENT ON COLUMN public.ugc_creators.user_id IS 'References auth.users(id). Can be NULL for creators who haven''t created accounts yet. Should be populated when creator creates an account.';

-- Update the foreign key constraint to allow NULL values
-- (This is already handled by making the column nullable) 