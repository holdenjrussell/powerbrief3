-- Migration: Fix announcement update permissions for brand sharing
-- Date: 2025-01-31
-- Description: Allow any user with brand access to update announcements, not just the creator

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own announcements" ON public.announcements;

-- Create new policy that allows updates by any user with brand access
CREATE POLICY "Users can update announcements for brands they have access to" ON public.announcements
FOR UPDATE USING (
  -- Allow if user has access to the brand (owner or shared)
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
    UNION
    SELECT brand_id FROM public.brand_shares 
    WHERE shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Also update delete policy to allow brand owners to delete any announcement in their brand
DROP POLICY IF EXISTS "Users can delete their own announcements" ON public.announcements;

CREATE POLICY "Users can delete announcements they created or in brands they own" ON public.announcements
FOR DELETE USING (
  -- User created the announcement
  user_id = auth.uid() 
  OR 
  -- User owns the brand
  brand_id IN (
    SELECT id FROM public.brands WHERE user_id = auth.uid()
  )
);

-- Add comment explaining the permissions
COMMENT ON POLICY "Users can update announcements for brands they have access to" ON public.announcements IS 
'Allows any user with access to a brand (owner or shared) to update announcements in that brand, enabling team collaboration';

COMMENT ON POLICY "Users can delete announcements they created or in brands they own" ON public.announcements IS 
'Allows users to delete announcements they created, and brand owners to delete any announcement in their brand'; 