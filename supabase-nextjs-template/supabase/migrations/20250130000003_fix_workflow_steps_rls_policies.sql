-- Fix missing RLS policies for ugc_workflow_steps table
-- Users should be able to INSERT, UPDATE, and DELETE workflow steps for their own brands

-- Add INSERT policy for workflow steps
CREATE POLICY "Users can create workflow steps for their brand workflows" 
    ON public.ugc_workflow_steps FOR INSERT
    WITH CHECK (workflow_id IN (
        SELECT id FROM public.ugc_workflow_templates 
        WHERE brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
    ));

-- Add UPDATE policy for workflow steps
CREATE POLICY "Users can update their brand workflow steps" 
    ON public.ugc_workflow_steps FOR UPDATE
    USING (workflow_id IN (
        SELECT id FROM public.ugc_workflow_templates 
        WHERE brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
    ));

-- Add DELETE policy for workflow steps
CREATE POLICY "Users can delete their brand workflow steps" 
    ON public.ugc_workflow_steps FOR DELETE
    USING (workflow_id IN (
        SELECT id FROM public.ugc_workflow_templates 
        WHERE brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
        )
    )); 