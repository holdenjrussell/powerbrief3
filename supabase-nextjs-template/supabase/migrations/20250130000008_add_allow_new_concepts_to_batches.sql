-- Add allow_new_concepts column to brief_batches table
-- This column controls whether new concepts can be added to the batch

-- Check if the column already exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brief_batches' 
        AND column_name = 'allow_new_concepts'
    ) THEN
        ALTER TABLE public.brief_batches 
        ADD COLUMN allow_new_concepts BOOLEAN DEFAULT true NOT NULL;
        
        -- Add comment
        COMMENT ON COLUMN public.brief_batches.allow_new_concepts IS 'Whether new concepts can be added to this batch. When false, the batch is closed for new concepts.';
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS brief_batches_allow_new_concepts_idx ON public.brief_batches(allow_new_concepts);
        
        RAISE NOTICE 'Added allow_new_concepts column to brief_batches table';
    ELSE
        RAISE NOTICE 'allow_new_concepts column already exists in brief_batches table';
    END IF;
END $$; 