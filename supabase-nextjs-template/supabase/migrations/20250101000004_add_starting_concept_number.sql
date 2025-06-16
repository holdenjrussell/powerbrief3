-- Add starting_concept_number column to brief_batches table
ALTER TABLE public.brief_batches 
ADD COLUMN IF NOT EXISTS starting_concept_number INTEGER DEFAULT 1;

-- Comment on the column
COMMENT ON COLUMN public.brief_batches.starting_concept_number IS 'Starting number for concept numbering in this batch';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS brief_batches_starting_concept_number_idx ON public.brief_batches(starting_concept_number); 