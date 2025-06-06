-- Create PowerFrame tables
-- This migration creates the necessary tables for the PowerFrame feature:
-- - page_types: Different types of pages (Home, Collection, PDP, etc.)
-- - wireframes: The main wireframe documents
-- - wireframe_modules: Individual modules/elements within a wireframe
-- - wireframe_shares: Public sharing functionality

-- Create page_types table
CREATE TABLE IF NOT EXISTS public.page_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  example_urls TEXT[],
  example_images TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wireframes table
CREATE TABLE IF NOT EXISTS public.wireframes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page_type_id UUID REFERENCES public.page_types(id) ON DELETE SET NULL,
  competitor_snapshot_url TEXT,
  extracted_modules JSONB,
  structure JSONB NOT NULL DEFAULT '{"rows": []}',
  ai_generated_content JSONB,
  system_instructions TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'shared')),
  share_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wireframe_modules table for reusable modules
CREATE TABLE IF NOT EXISTS public.wireframe_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wireframe_id UUID NOT NULL REFERENCES public.wireframes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'button', 'container', 'header', 'footer')),
  content JSONB NOT NULL,
  position JSONB NOT NULL, -- {row: number, column: number, width: number, height: number}
  alignment TEXT DEFAULT 'left' CHECK (alignment IN ('left', 'center', 'right', 'justify')),
  is_content_placeholder BOOLEAN DEFAULT false, -- true if AI should generate content for this
  is_design_descriptor BOOLEAN DEFAULT false, -- true if this is just a descriptor for designers
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wireframe_shares table for public sharing
CREATE TABLE IF NOT EXISTS public.wireframe_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wireframe_id UUID NOT NULL REFERENCES public.wireframes(id) ON DELETE CASCADE,
  share_id TEXT UNIQUE NOT NULL,
  is_editable BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS page_types_user_id_idx ON public.page_types(user_id);
CREATE INDEX IF NOT EXISTS page_types_brand_id_idx ON public.page_types(brand_id);
CREATE INDEX IF NOT EXISTS wireframes_user_id_idx ON public.wireframes(user_id);
CREATE INDEX IF NOT EXISTS wireframes_brand_id_idx ON public.wireframes(brand_id);
CREATE INDEX IF NOT EXISTS wireframes_page_type_id_idx ON public.wireframes(page_type_id);
CREATE INDEX IF NOT EXISTS wireframe_modules_wireframe_id_idx ON public.wireframe_modules(wireframe_id);
CREATE INDEX IF NOT EXISTS wireframe_shares_share_id_idx ON public.wireframe_shares(share_id);
CREATE INDEX IF NOT EXISTS wireframe_shares_wireframe_id_idx ON public.wireframe_shares(wireframe_id);

-- Enable RLS
ALTER TABLE public.page_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wireframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wireframe_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wireframe_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_types
CREATE POLICY "Users can view their own page types" ON public.page_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own page types" ON public.page_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own page types" ON public.page_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own page types" ON public.page_types
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for wireframes
CREATE POLICY "Users can view their own wireframes" ON public.wireframes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wireframes" ON public.wireframes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wireframes" ON public.wireframes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wireframes" ON public.wireframes
  FOR DELETE USING (auth.uid() = user_id);

-- Public access for shared wireframes
CREATE POLICY "Anyone can view shared wireframes" ON public.wireframes
  FOR SELECT USING (share_settings IS NOT NULL AND share_settings != '{}'::jsonb);

-- RLS Policies for wireframe_modules
CREATE POLICY "Users can view modules of their wireframes" ON public.wireframe_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create modules for their wireframes" ON public.wireframe_modules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update modules of their wireframes" ON public.wireframe_modules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete modules of their wireframes" ON public.wireframe_modules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND w.user_id = auth.uid()
    )
  );

-- Public access for modules of shared wireframes
CREATE POLICY "Anyone can view modules of shared wireframes" ON public.wireframe_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_modules.wireframe_id
      AND w.share_settings IS NOT NULL 
      AND w.share_settings != '{}'::jsonb
    )
  );

-- RLS Policies for wireframe_shares
CREATE POLICY "Users can view shares they created" ON public.wireframe_shares
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create shares for their wireframes" ON public.wireframe_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wireframes w
      WHERE w.id = wireframe_shares.wireframe_id
      AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares they created" ON public.wireframe_shares
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete shares they created" ON public.wireframe_shares
  FOR DELETE USING (auth.uid() = created_by);

-- Anyone can view shares by share_id
CREATE POLICY "Anyone can view shares by share_id" ON public.wireframe_shares
  FOR SELECT USING (true);

-- Create default page types function
CREATE OR REPLACE FUNCTION create_default_page_types(p_brand_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.page_types (brand_id, user_id, name, description, is_default)
  VALUES 
    (p_brand_id, p_user_id, 'Home Page', 'Main landing page of the website', true),
    (p_brand_id, p_user_id, 'Collection Page', 'Product collection or category page', true),
    (p_brand_id, p_user_id, 'PDP', 'Product Detail Page', true),
    (p_brand_id, p_user_id, 'Listicle', 'List-based content page', true),
    (p_brand_id, p_user_id, 'Advertorial', 'Advertisement styled as editorial content', true);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_page_types(UUID, UUID) TO authenticated;

-- Create storage bucket for PowerFrame media files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('powerframe-media', 'powerframe-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the PowerFrame media bucket
DROP POLICY IF EXISTS "Allow public read access for powerframe-media" ON storage.objects;
CREATE POLICY "Allow public read access for powerframe-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'powerframe-media');

DROP POLICY IF EXISTS "Allow authenticated users to upload to powerframe-media" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to powerframe-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'powerframe-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow users to update their own objects in powerframe-media" ON storage.objects;
CREATE POLICY "Allow users to update their own objects in powerframe-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'powerframe-media' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'powerframe-media');

DROP POLICY IF EXISTS "Allow users to delete their own objects in powerframe-media" ON storage.objects;
CREATE POLICY "Allow users to delete their own objects in powerframe-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'powerframe-media' AND auth.uid() = owner); 