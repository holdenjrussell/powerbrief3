-- Fix RLS policy for brand_automation_settings to include shared brand access
-- This allows users with shared brand access to manage automation settings

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage their brand's automation settings" ON public.brand_automation_settings;

-- Create new policy that includes both direct ownership and shared access
CREATE POLICY "Users can manage automation settings for owned or shared brands" 
  ON public.brand_automation_settings FOR ALL
  USING (
    brand_id IN (
      -- Direct ownership
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()
      
      UNION
      
      -- Shared access (accepted shares only)
      SELECT brand_id FROM public.brand_shares 
      WHERE shared_with_user_id = auth.uid() 
      AND status = 'accepted'
    )
  ); 