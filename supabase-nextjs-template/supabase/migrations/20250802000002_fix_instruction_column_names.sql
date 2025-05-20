-- Fix instruction column naming inconsistencies

-- Check for designer_instructions column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'designer_instructions'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN designer_instructions TEXT DEFAULT NULL;
    END IF;
END $$;

-- Check for video_instructions column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'brief_concepts' 
        AND column_name = 'video_instructions'
    ) THEN
        ALTER TABLE public.brief_concepts
        ADD COLUMN video_instructions TEXT DEFAULT NULL;
    END IF;
END $$;

-- Remove camelCase columns if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'brief_concepts'
        AND column_name = 'designerinstructions'
    ) THEN
        ALTER TABLE public.brief_concepts
        DROP COLUMN designerinstructions;
    END IF;
    
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'brief_concepts'
        AND column_name = 'videoinstructions'
    ) THEN
        ALTER TABLE public.brief_concepts
        DROP COLUMN videoinstructions;
    END IF;
END $$; 