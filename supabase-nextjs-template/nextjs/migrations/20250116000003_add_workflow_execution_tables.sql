-- Add workflow execution tracking tables for UGC Coordinator

-- Workflow Executions Table - Track running workflows
CREATE TABLE IF NOT EXISTS public.ugc_workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.ugc_workflow_templates(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'pending_human_review', 'paused')),
  trigger_event TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_step TEXT NOT NULL DEFAULT 'initial',
  current_step_id UUID REFERENCES public.ugc_workflow_steps(id),
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  context JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_executions_workflow_id ON public.ugc_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_executions_creator_id ON public.ugc_workflow_executions(creator_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_executions_status ON public.ugc_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_executions_started_at ON public.ugc_workflow_executions(started_at);

-- Update Human Intervention Queue table to support workflow executions
ALTER TABLE public.ugc_human_intervention_queue 
ADD COLUMN IF NOT EXISTS workflow_execution_id UUID REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE;

-- Add index for workflow execution reference
CREATE INDEX IF NOT EXISTS idx_ugc_human_intervention_queue_workflow_execution_id 
ON public.ugc_human_intervention_queue(workflow_execution_id);

-- Workflow Step Executions Table - Track individual step executions
CREATE TABLE IF NOT EXISTS public.ugc_workflow_step_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.ugc_workflow_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for step executions
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_step_executions_workflow_execution_id 
ON public.ugc_workflow_step_executions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_step_executions_step_id 
ON public.ugc_workflow_step_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_step_executions_status 
ON public.ugc_workflow_step_executions(status);

-- Email Thread Tracking for Workflow Context
CREATE TABLE IF NOT EXISTS public.ugc_workflow_email_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL, -- External email thread ID
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workflow_execution_id, thread_id)
);

-- Add indexes for email threads
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_workflow_execution_id 
ON public.ugc_workflow_email_threads(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_creator_id 
ON public.ugc_workflow_email_threads(creator_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_thread_id 
ON public.ugc_workflow_email_threads(thread_id);

-- Workflow Variables Table - Store dynamic variables for workflows
CREATE TABLE IF NOT EXISTS public.ugc_workflow_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  variable_value JSONB,
  variable_type TEXT DEFAULT 'string' CHECK (variable_type IN ('string', 'number', 'boolean', 'object', 'array')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workflow_execution_id, variable_name)
);

-- Add index for workflow variables
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_variables_workflow_execution_id 
ON public.ugc_workflow_variables(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_variables_variable_name 
ON public.ugc_workflow_variables(variable_name);

-- Enable RLS on new tables
ALTER TABLE public.ugc_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_variables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow executions
CREATE POLICY "Users can view workflow executions for their brands" ON public.ugc_workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_templates wt
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE wt.id = ugc_workflow_executions.workflow_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert workflow executions for their brands" ON public.ugc_workflow_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_templates wt
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE wt.id = ugc_workflow_executions.workflow_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update workflow executions for their brands" ON public.ugc_workflow_executions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_templates wt
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE wt.id = ugc_workflow_executions.workflow_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for step executions
CREATE POLICY "Users can view step executions for their brands" ON public.ugc_workflow_step_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_step_executions.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert step executions for their brands" ON public.ugc_workflow_step_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_step_executions.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update step executions for their brands" ON public.ugc_workflow_step_executions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_step_executions.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for email threads
CREATE POLICY "Users can view email threads for their brands" ON public.ugc_workflow_email_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_email_threads.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert email threads for their brands" ON public.ugc_workflow_email_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_email_threads.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update email threads for their brands" ON public.ugc_workflow_email_threads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_email_threads.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for workflow variables
CREATE POLICY "Users can view workflow variables for their brands" ON public.ugc_workflow_variables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_variables.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert workflow variables for their brands" ON public.ugc_workflow_variables
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_variables.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update workflow variables for their brands" ON public.ugc_workflow_variables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_variables.workflow_execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function to automatically create default workflow for new brands
CREATE OR REPLACE FUNCTION public.create_default_workflow_for_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called by the application layer
  -- We don't create the workflow here to avoid complex SQL
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default workflow (placeholder - actual creation handled by app)
DROP TRIGGER IF EXISTS create_default_workflow_trigger ON public.brands;
CREATE TRIGGER create_default_workflow_trigger
  AFTER INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_workflow_for_brand();