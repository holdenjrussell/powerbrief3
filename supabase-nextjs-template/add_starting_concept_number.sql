-- Add starting_concept_number column to brief_batches table
-- This can be run directly in the Supabase SQL editor

-- Check if the column already exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brief_batches' 
        AND column_name = 'starting_concept_number'
    ) THEN
        ALTER TABLE public.brief_batches 
        ADD COLUMN starting_concept_number INTEGER DEFAULT 1;
        
        -- Add comment
        COMMENT ON COLUMN public.brief_batches.starting_concept_number IS 'Starting number for concept numbering in this batch';
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS brief_batches_starting_concept_number_idx ON public.brief_batches(starting_concept_number);
        
        RAISE NOTICE 'Added starting_concept_number column to brief_batches table';
    ELSE
        RAISE NOTICE 'starting_concept_number column already exists in brief_batches table';
    END IF;
END $$; 