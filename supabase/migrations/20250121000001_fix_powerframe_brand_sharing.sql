-- Fix PowerFrame RLS policies to support brand sharing
-- This migration updates wireframes, page_types, and wireframe_modules RLS policies 
-- to allow access for users who have been granted brand sharing permissions

-- Drop existing policies for wireframes
DROP POLICY IF EXISTS "Users can view their own wireframes" ON public.wireframes;
DROP POLICY IF EXISTS "Users can create their own wireframes" ON public.wireframes;
DROP POLICY IF EXISTS "Users can update their own wireframes" ON public.wireframes;
DROP POLICY IF EXISTS "Users can delete their own wireframes" ON public.wireframes;

-- Create new wireframes policies that include brand sharing
CREATE POLICY "Users can view wireframes for accessible brands" ON public.wireframes
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = wireframes.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
    )
  );

CREATE POLICY "Users can create wireframes for accessible brands" ON public.wireframes
  FOR INSERT WITH CHECK (
    -- Check if user owns the brand or has editor access
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = wireframes.brand_id
      AND (
        b.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = b.id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
          AND bs.role = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can update wireframes for accessible brands" ON public.wireframes
  FOR UPDATE USING (
    -- User owns the wireframe OR has editor access to the brand
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = wireframes.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
      AND bs.role = 'editor'
    )
  );

CREATE POLICY "Users can delete wireframes for accessible brands" ON public.wireframes
  FOR DELETE USING (
    -- User owns the wireframe OR has editor access to the brand
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = wireframes.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
      AND bs.role = 'editor'
    )
  );

-- Drop existing policies for page_types
DROP POLICY IF EXISTS "Users can view their own page types" ON public.page_types;
DROP POLICY IF EXISTS "Users can create their own page types" ON public.page_types;
DROP POLICY IF EXISTS "Users can update their own page types" ON public.page_types;
DROP POLICY IF EXISTS "Users can delete their own page types" ON public.page_types;

-- Create new page_types policies that include brand sharing
CREATE POLICY "Users can view page types for accessible brands" ON public.page_types
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = page_types.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
    )
  );

CREATE POLICY "Users can create page types for accessible brands" ON public.page_types
  FOR INSERT WITH CHECK (
    -- Check if user owns the brand or has editor access
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = page_types.brand_id
      AND (
        b.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = b.id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
          AND bs.role = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can update page types for accessible brands" ON public.page_types
  FOR UPDATE USING (
    -- User owns the page type OR has editor access to the brand
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = page_types.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
      AND bs.role = 'editor'
    )
  );

CREATE POLICY "Users can delete page types for accessible brands" ON public.page_types
  FOR DELETE USING (
    -- User owns the page type OR has editor access to the brand
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.brand_shares bs
      WHERE bs.brand_id = page_types.brand_id
      AND bs.shared_with_user_id = auth.uid()
      AND bs.status = 'accepted'
      AND bs.role = 'editor'
    )
  );

-- Drop existing policies for wireframe_modules
DROP POLICY IF EXISTS "Users can view modules of their wireframes" ON public.wireframe_modules;
DROP POLICY IF EXISTS "Users can create modules for their wireframes" ON public.wireframe_modules;
DROP POLICY IF EXISTS "Users can update modules of their wireframes" ON public.wireframe_modules;
DROP POLICY IF EXISTS "Users can delete modules of their wireframes" ON public.wireframe_modules;

-- Create new wireframe_modules policies that include brand sharing
CREATE POLICY "Users can view modules for accessible wireframes" ON public.wireframe_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND (
        w.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = w.brand_id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
        )
      )
    )
  );

CREATE POLICY "Users can create modules for accessible wireframes" ON public.wireframe_modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      JOIN public.brands b ON b.id = w.brand_id
      WHERE w.id = wireframe_modules.wireframe_id
      AND (
        w.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = w.brand_id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
          AND bs.role = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can update modules for accessible wireframes" ON public.wireframe_modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND (
        w.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = w.brand_id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
          AND bs.role = 'editor'
        )
      )
    )
  );

CREATE POLICY "Users can delete modules for accessible wireframes" ON public.wireframe_modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND (
        w.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = w.brand_id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
          AND bs.role = 'editor'
        )
      )
    )
  );

-- Update the shared wireframes policies to also include brand sharing access
DROP POLICY IF EXISTS "Anyone can view modules of shared wireframes" ON public.wireframe_modules;
CREATE POLICY "Anyone can view modules of shared wireframes" ON public.wireframe_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND (
        -- Public sharing via share_settings
        (w.share_settings IS NOT NULL AND w.share_settings != '{}'::jsonb) OR
        -- Brand sharing access
        EXISTS (
          SELECT 1 FROM public.brand_shares bs
          WHERE bs.brand_id = w.brand_id
          AND bs.shared_with_user_id = auth.uid()
          AND bs.status = 'accepted'
        )
      )
    )
  );

-- Add comments to document the changes
COMMENT ON POLICY "Users can view wireframes for accessible brands" ON public.wireframes IS 'Allows users to view wireframes they own or for brands shared with them';
COMMENT ON POLICY "Users can create wireframes for accessible brands" ON public.wireframes IS 'Allows users to create wireframes for brands they own or have editor access to';
COMMENT ON POLICY "Users can update wireframes for accessible brands" ON public.wireframes IS 'Allows users to update wireframes they own or for brands they have editor access to';
COMMENT ON POLICY "Users can delete wireframes for accessible brands" ON public.wireframes IS 'Allows users to delete wireframes they own or for brands they have editor access to';

COMMENT ON POLICY "Users can view page types for accessible brands" ON public.page_types IS 'Allows users to view page types for brands they own or have access to';
COMMENT ON POLICY "Users can create page types for accessible brands" ON public.page_types IS 'Allows users to create page types for brands they own or have editor access to';
COMMENT ON POLICY "Users can update page types for accessible brands" ON public.page_types IS 'Allows users to update page types for brands they own or have editor access to';
COMMENT ON POLICY "Users can delete page types for accessible brands" ON public.page_types IS 'Allows users to delete page types for brands they own or have editor access to'; 