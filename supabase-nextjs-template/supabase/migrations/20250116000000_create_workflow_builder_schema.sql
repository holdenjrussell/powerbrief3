-- UGC Workflow Builder System
-- Migration to create workflow automation tables

-- Workflow Templates Table - Define reusable workflows for brands
CREATE TABLE IF NOT EXISTS public.ugc_workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'script_pipeline', 'rate_negotiation', 'product_shipment', 'contract_signing', 'content_delivery')),
  trigger_event TEXT NOT NULL, -- 'creator_added', 'status_change', 'manual', 'time_based'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workflow Steps Table - Individual steps within workflows
CREATE TABLE IF NOT EXISTS public.ugc_workflow_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.ugc_workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  step_type TEXT NOT NULL CHECK (step_type IN ('action', 'condition', 'wait', 'human_intervention')),
  config JSONB DEFAULT '{}'::jsonb, -- Store step-specific configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workflow_id, step_order)
);

-- Workflow Actions Table - Define available actions
CREATE TABLE IF NOT EXISTS public.ugc_workflow_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('send_email', 'update_status', 'assign_script', 'schedule_call', 'send_notification', 'create_task', 'ai_generate')),
  input_schema JSONB DEFAULT '{}'::jsonb, -- JSON schema for required inputs
  output_schema JSONB DEFAULT '{}'::jsonb, -- JSON schema for outputs
  is_system BOOLEAN DEFAULT true, -- System actions vs custom actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workflow Conditions Table - Define conditions for branching
CREATE TABLE IF NOT EXISTS public.ugc_workflow_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.ugc_workflow_steps(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('status_equals', 'field_contains', 'time_elapsed', 'response_received', 'custom_logic')),
  field_name TEXT, -- Field to check (e.g., 'status', 'email', etc.)
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'exists', 'not_exists')),
  expected_value TEXT,
  next_step_id UUID REFERENCES public.ugc_workflow_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workflow Executions Table - Track workflow runs for creators
CREATE TABLE IF NOT EXISTS public.ugc_workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.ugc_workflow_templates(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.ugc_workflow_steps(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'waiting_human')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  context JSONB DEFAULT '{}'::jsonb, -- Store execution context and variables
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workflow Step Executions Table - Track individual step executions
CREATE TABLE IF NOT EXISTS public.ugc_workflow_step_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.ugc_workflow_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom Creator Statuses Table - Allow brands to define custom statuses
CREATE TABLE IF NOT EXISTS public.ugc_custom_creator_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  status_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'script_pipeline', 'negotiation', 'production', 'delivery')),
  display_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#6B7280', -- Hex color for UI display
  is_active BOOLEAN DEFAULT true,
  is_final BOOLEAN DEFAULT false, -- Terminal status (end of workflow)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, status_name)
);

-- Message Templates Table - Templates with variable support
CREATE TABLE IF NOT EXISTS public.ugc_message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('email', 'sms', 'slack', 'notification')),
  subject TEXT, -- For emails
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}', -- Available variables like {creator_name}, {script_link}
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT, -- Prompt for AI-generated content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Human Intervention Queue Table - Tasks requiring human input
CREATE TABLE IF NOT EXISTS public.ugc_human_intervention_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.ugc_workflow_steps(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
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

-- Creator Marketplace Applications Table
CREATE TABLE IF NOT EXISTS public.ugc_marketplace_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE SET NULL, -- NULL if not yet a creator
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  portfolio_link TEXT,
  demographics JSONB DEFAULT '{}'::jsonb, -- Age, gender, location, etc.
  content_types TEXT[] DEFAULT '{}', -- Types of content they create
  platforms TEXT[] DEFAULT '{}', -- Platforms they're active on
  application_data JSONB DEFAULT '{}'::jsonb, -- Form responses
  consent_email BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Brand Job Postings Table - For marketplace
CREATE TABLE IF NOT EXISTS public.ugc_brand_job_postings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  compensation_range TEXT,
  content_types TEXT[] DEFAULT '{}',
  target_demographics JSONB DEFAULT '{}'::jsonb,
  application_deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  slots_available INTEGER,
  slots_filled INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Job Applications Table - Creators applying to brand jobs
CREATE TABLE IF NOT EXISTS public.ugc_job_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.ugc_brand_job_postings(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  marketplace_application_id UUID REFERENCES public.ugc_marketplace_applications(id) ON DELETE CASCADE,
  cover_letter TEXT,
  portfolio_samples TEXT[], -- URLs to portfolio pieces
  proposed_rate DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'rejected', 'accepted')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_creator_or_marketplace CHECK (
    (creator_id IS NOT NULL AND marketplace_application_id IS NULL) OR 
    (creator_id IS NULL AND marketplace_application_id IS NOT NULL)
  )
);

-- Insert default system actions
INSERT INTO public.ugc_workflow_actions (name, description, action_type, input_schema, output_schema, is_system) VALUES
('Send Email', 'Send an email to the creator', 'send_email', '{"template_id": "string", "variables": "object"}', '{"message_id": "string", "sent_at": "timestamp"}', true),
('Update Creator Status', 'Update the creator status', 'update_status', '{"new_status": "string", "reason": "string"}', '{"old_status": "string", "new_status": "string"}', true),
('Assign Script', 'Assign a script to the creator', 'assign_script', '{"script_id": "string", "due_date": "timestamp"}', '{"assignment_id": "string"}', true),
('Schedule Call', 'Schedule a call with the creator', 'schedule_call', '{"calendar_link": "string", "duration": "number"}', '{"calendar_event_id": "string"}', true),
('Send Notification', 'Send an internal notification', 'send_notification', '{"message": "string", "recipients": "array"}', '{"notification_id": "string"}', true),
('Create Task', 'Create a task for team members', 'create_task', '{"title": "string", "description": "string", "assignee": "string"}', '{"task_id": "string"}', true),
('Generate AI Content', 'Generate AI content using prompts', 'ai_generate', '{"prompt": "string", "content_type": "string"}', '{"generated_content": "string"}', true);

-- Add RLS policies
ALTER TABLE public.ugc_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_custom_creator_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_human_intervention_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_marketplace_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_brand_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_job_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workflow templates
CREATE POLICY "Users can view their brand workflow templates" 
    ON public.ugc_workflow_templates FOR SELECT
    USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can create workflow templates for their brands" 
    ON public.ugc_workflow_templates FOR INSERT
    WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their brand workflow templates" 
    ON public.ugc_workflow_templates FOR UPDATE
    USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their brand workflow templates" 
    ON public.ugc_workflow_templates FOR DELETE
    USING (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- Create similar policies for other tables (abbreviated for brevity)
CREATE POLICY "Users can view their workflow steps" ON public.ugc_workflow_steps FOR SELECT
    USING (workflow_id IN (SELECT id FROM public.ugc_workflow_templates WHERE brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())));

CREATE POLICY "Anyone can view system actions" ON public.ugc_workflow_actions FOR SELECT USING (is_system = true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS ugc_workflow_templates_brand_id_idx ON public.ugc_workflow_templates(brand_id);
CREATE INDEX IF NOT EXISTS ugc_workflow_steps_workflow_id_idx ON public.ugc_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS ugc_workflow_executions_creator_id_idx ON public.ugc_workflow_executions(creator_id);
CREATE INDEX IF NOT EXISTS ugc_workflow_executions_status_idx ON public.ugc_workflow_executions(status);
CREATE INDEX IF NOT EXISTS ugc_human_intervention_queue_status_idx ON public.ugc_human_intervention_queue(status);
CREATE INDEX IF NOT EXISTS ugc_marketplace_applications_status_idx ON public.ugc_marketplace_applications(status);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_ugc_workflow_templates_updated_at BEFORE UPDATE ON public.ugc_workflow_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_workflow_steps_updated_at BEFORE UPDATE ON public.ugc_workflow_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_workflow_executions_updated_at BEFORE UPDATE ON public.ugc_workflow_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_workflow_step_executions_updated_at BEFORE UPDATE ON public.ugc_workflow_step_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_custom_creator_statuses_updated_at BEFORE UPDATE ON public.ugc_custom_creator_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_message_templates_updated_at BEFORE UPDATE ON public.ugc_message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_human_intervention_queue_updated_at BEFORE UPDATE ON public.ugc_human_intervention_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_marketplace_applications_updated_at BEFORE UPDATE ON public.ugc_marketplace_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_brand_job_postings_updated_at BEFORE UPDATE ON public.ugc_brand_job_postings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_job_applications_updated_at BEFORE UPDATE ON public.ugc_job_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 