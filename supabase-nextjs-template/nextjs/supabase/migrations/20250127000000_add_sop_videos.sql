-- Create table for SOP training videos
CREATE TABLE IF NOT EXISTS public.sop_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id TEXT NOT NULL, -- e.g., 'brand-config', 'ugc-pipeline', etc.
    title TEXT,
    description TEXT,
    video_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT,
    file_size BIGINT,
    duration INTEGER, -- in seconds
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true, -- allow multiple videos but only one active
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sop_videos_sop_id ON public.sop_videos(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_videos_active ON public.sop_videos(sop_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sop_videos_created_at ON public.sop_videos(created_at DESC);

-- Enable RLS
ALTER TABLE public.sop_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active SOP videos (for training purposes)
CREATE POLICY "Anyone can view active SOP videos"
    ON public.sop_videos
    FOR SELECT
    USING (is_active = true);

-- Only authenticated users can view all SOP videos (including inactive ones)
CREATE POLICY "Authenticated users can view all SOP videos"
    ON public.sop_videos
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only authenticated users can upload SOP videos
CREATE POLICY "Authenticated users can upload SOP videos"
    ON public.sop_videos
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only the uploader or service role can update SOP videos
CREATE POLICY "Users can update their own SOP videos"
    ON public.sop_videos
    FOR UPDATE
    USING (uploaded_by = auth.uid() OR auth.role() = 'service_role');

-- Only the uploader or service role can delete SOP videos
CREATE POLICY "Users can delete their own SOP videos"
    ON public.sop_videos
    FOR DELETE
    USING (uploaded_by = auth.uid() OR auth.role() = 'service_role');

-- Function to automatically deactivate other videos when a new one is made active
CREATE OR REPLACE FUNCTION deactivate_other_sop_videos()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new/updated video is active, deactivate all other videos for the same SOP
    IF NEW.is_active = true THEN
        UPDATE public.sop_videos 
        SET is_active = false, updated_at = now()
        WHERE sop_id = NEW.sop_id 
        AND id != NEW.id 
        AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one active video per SOP
CREATE TRIGGER ensure_single_active_sop_video
    BEFORE INSERT OR UPDATE ON public.sop_videos
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_other_sop_videos();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sop_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_sop_videos_updated_at_trigger
    BEFORE UPDATE ON public.sop_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_sop_videos_updated_at(); 