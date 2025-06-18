-- Create table for tracking OneSheet ad sync jobs
CREATE TABLE IF NOT EXISTS public.onesheet_sync_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    onesheet_id UUID NOT NULL REFERENCES public.onesheet(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Date range for the sync
    date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Progress tracking
    total_ads INTEGER DEFAULT 0,
    processed_ads INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_onesheet_sync_jobs_onesheet_id ON public.onesheet_sync_jobs(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_sync_jobs_brand_id ON public.onesheet_sync_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_sync_jobs_status ON public.onesheet_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_onesheet_sync_jobs_created_at ON public.onesheet_sync_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.onesheet_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view sync jobs for their brands" ON public.onesheet_sync_jobs;
    DROP POLICY IF EXISTS "Users can create sync jobs for their brands" ON public.onesheet_sync_jobs;
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, continue
        NULL;
END $$;

CREATE POLICY "Users can view sync jobs for their brands" ON public.onesheet_sync_jobs
FOR SELECT USING (
    brand_id IN (
        SELECT id FROM public.brands 
        WHERE user_id = auth.uid()
    )
    OR
    brand_id IN (
        SELECT brand_id FROM public.brand_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can create sync jobs for their brands" ON public.onesheet_sync_jobs
FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (
        brand_id IN (
            SELECT id FROM public.brands 
            WHERE user_id = auth.uid()
        )
        OR
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    )
);

-- Add comment
COMMENT ON TABLE public.onesheet_sync_jobs IS 'Tracks asynchronous Meta ads sync jobs for OneSheet performance data'; 