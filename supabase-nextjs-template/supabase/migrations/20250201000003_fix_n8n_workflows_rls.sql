-- Fix RLS policies for brand_n8n_workflows to include shared brand access
-- This allows users with shared brand access to manage n8n workflows

-- Drop the existing policies
DROP POLICY IF EXISTS "Users can view their brand's n8n workflows" ON public.brand_n8n_workflows;
DROP POLICY IF EXISTS "Users can manage their brand's n8n workflows" ON public.brand_n8n_workflows;

-- Create new policies that include both direct ownership and shared access
CREATE POLICY "Users can view n8n workflows for owned or shared brands" 
  ON public.brand_n8n_workflows FOR SELECT
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

CREATE POLICY "Users can manage n8n workflows for owned or shared brands" 
  ON public.brand_n8n_workflows FOR ALL
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