-- Add Editors Support
-- This migration adds support for saved editors per brand while maintaining backward compatibility
-- with existing free-text editor fields

-- Create editors table to store saved editors for each brand
CREATE TABLE IF NOT EXISTS public.editors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'editor' CHECK (role IN ('editor', 'designer', 'video_editor', 'both')),
    specialties TEXT[], -- Array of specialties like ['video', 'image', 'motion_graphics']
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique editor names per brand
    UNIQUE(brand_id, name)
);

-- Add new columns to brief_concepts table for editor references
-- Keep existing video_editor field for backward compatibility
ALTER TABLE public.brief_concepts 
ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES public.editors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS custom_editor_name TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS editors_brand_id_idx ON public.editors(brand_id);
CREATE INDEX IF NOT EXISTS editors_user_id_idx ON public.editors(user_id);
CREATE INDEX IF NOT EXISTS editors_is_active_idx ON public.editors(is_active);
CREATE INDEX IF NOT EXISTS editors_role_idx ON public.editors(role);
CREATE INDEX IF NOT EXISTS brief_concepts_editor_id_idx ON public.brief_concepts(editor_id);

-- Add trigger for editors table to update updated_at
DROP TRIGGER IF EXISTS update_editors_updated_at ON public.editors;
CREATE TRIGGER update_editors_updated_at
BEFORE UPDATE ON public.editors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on editors table
ALTER TABLE public.editors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for editors table
CREATE POLICY "Users can view editors for their brands" 
    ON public.editors FOR SELECT
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = editors.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert editors for their brands" 
    ON public.editors FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = editors.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update editors for their brands" 
    ON public.editors FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = editors.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete editors for their brands" 
    ON public.editors FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands 
            WHERE brands.id = editors.brand_id 
            AND brands.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.editors IS 'Stores saved editors/designers for each brand';
COMMENT ON COLUMN public.editors.role IS 'Type of editor: editor, designer, video_editor, or both';
COMMENT ON COLUMN public.editors.specialties IS 'Array of specialties like video, image, motion_graphics';
COMMENT ON COLUMN public.editors.is_active IS 'Whether the editor is currently active/available';
COMMENT ON COLUMN public.brief_concepts.editor_id IS 'Reference to saved editor from editors table';
COMMENT ON COLUMN public.brief_concepts.custom_editor_name IS 'Free-text editor name when not using saved editor';

-- Create a view for easy editor selection that combines saved and custom editors
CREATE OR REPLACE VIEW public.concept_editors AS
SELECT 
    bc.id as concept_id,
    bc.brief_batch_id,
    CASE 
        WHEN bc.editor_id IS NOT NULL THEN e.name
        WHEN bc.custom_editor_name IS NOT NULL THEN bc.custom_editor_name
        ELSE bc.video_editor -- Fallback to legacy field
    END as editor_name,
    CASE 
        WHEN bc.editor_id IS NOT NULL THEN 'saved'
        WHEN bc.custom_editor_name IS NOT NULL THEN 'custom'
        ELSE 'legacy'
    END as editor_type,
    bc.editor_id,
    e.email as editor_email,
    e.role as editor_role,
    e.specialties as editor_specialties
FROM public.brief_concepts bc
LEFT JOIN public.editors e ON bc.editor_id = e.id;

-- Add RLS to the view
ALTER VIEW public.concept_editors SET (security_invoker = true);

-- Create a function to get available editors for a brand
CREATE OR REPLACE FUNCTION public.get_brand_editors(brand_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    specialties TEXT[],
    is_active BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.email,
        e.role,
        e.specialties,
        e.is_active,
        e.notes
    FROM public.editors e
    WHERE e.brand_id = brand_uuid 
    AND e.is_active = true
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_brand_editors(UUID) TO authenticated; 