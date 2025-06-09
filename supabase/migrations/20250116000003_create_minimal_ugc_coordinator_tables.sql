-- Minimal UGC Coordinator Tables and Views
-- This creates the essential tables needed for the UGC Coordinator dashboard to work

-- Create the human intervention queue table (referenced by the API)
CREATE TABLE IF NOT EXISTS public.ugc_human_intervention_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL, -- Will reference ugc_workflow_executions when it exists
  step_id UUID NOT NULL, -- Will reference ugc_workflow_steps when it exists
  creator_id UUID NOT NULL, -- Will reference ugc_creators when it exists
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create alias table for the human review queue (API expects this name)
CREATE OR REPLACE VIEW public.ugc_human_review_queue AS 
SELECT 
  id,
  execution_id as workflow_execution_id,
  step_id,
  creator_id,
  brand_id,
  assigned_to,
  priority,
  title,
  description,
  context,
  status,
  due_date,
  completed_at,
  completed_by,
  resolution_notes,
  created_at,
  updated_at
FROM public.ugc_human_intervention_queue;

-- Create a minimal workflow execution view (API expects this)
-- This will return empty results until the full workflow tables are created
CREATE OR REPLACE VIEW public.ugc_workflow_execution_view AS 
SELECT 
  gen_random_uuid() as id,
  gen_random_uuid() as workflow_id,
  gen_random_uuid() as creator_id,
  gen_random_uuid() as brand_id,
  NULL::UUID as current_step_id,
  'completed'::TEXT as status,
  now() as started_at,
  now() as completed_at,
  NULL::TEXT as error_message,
  '{}'::JSONB as context,
  now() as created_at,
  now() as updated_at,
  100 as completion_percentage,
  1 as completed_steps,
  1 as total_steps,
  'Sample Step'::TEXT as current_step_name
WHERE FALSE; -- This ensures no rows are returned until real data exists

-- Enable RLS on the human intervention queue
ALTER TABLE public.ugc_human_intervention_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for human intervention queue
CREATE POLICY "Users can manage human intervention queue for accessible brands" 
    ON public.ugc_human_intervention_queue FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Grant permissions on the views
GRANT SELECT ON public.ugc_human_review_queue TO authenticated;
GRANT SELECT ON public.ugc_workflow_execution_view TO authenticated;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ugc_human_intervention_queue_updated_at 
    BEFORE UPDATE ON public.ugc_human_intervention_queue 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ugc_human_intervention_queue_brand_id ON public.ugc_human_intervention_queue(brand_id);
CREATE INDEX IF NOT EXISTS idx_ugc_human_intervention_queue_status ON public.ugc_human_intervention_queue(status);
CREATE INDEX IF NOT EXISTS idx_ugc_human_intervention_queue_priority ON public.ugc_human_intervention_queue(priority);