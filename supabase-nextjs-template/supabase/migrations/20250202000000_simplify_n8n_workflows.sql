-- Simplify n8n workflows for shared implementation approach
-- This migration updates the brand_n8n_workflows table to support the new simplified workflow system

-- Update the brand_n8n_workflows table structure
-- Remove the unique constraint and n8n_workflow_id dependency
ALTER TABLE public.brand_n8n_workflows 
DROP CONSTRAINT IF EXISTS brand_n8n_workflows_brand_id_template_name_key;

-- Drop the n8n_workflow_id column since we're using shared workflows
ALTER TABLE public.brand_n8n_workflows 
DROP COLUMN IF EXISTS n8n_workflow_id;

-- Rename template_name to workflow_name for clarity
ALTER TABLE public.brand_n8n_workflows 
RENAME COLUMN template_name TO workflow_name;

-- Add new unique constraint for brand_id + workflow_name
ALTER TABLE public.brand_n8n_workflows 
ADD CONSTRAINT brand_n8n_workflows_brand_id_workflow_name_key 
UNIQUE (brand_id, workflow_name);

-- Update indexes
DROP INDEX IF EXISTS idx_brand_n8n_workflows_template_name;
CREATE INDEX IF NOT EXISTS idx_brand_n8n_workflows_workflow_name 
ON public.brand_n8n_workflows(workflow_name);

-- Insert default workflow configurations for existing brands
-- This will make the "creator_application_acknowledgment" workflow available for all brands
INSERT INTO public.brand_n8n_workflows (brand_id, workflow_name, is_active, configuration)
SELECT 
  id as brand_id,
  'creator_application_acknowledgment' as workflow_name,
  false as is_active, -- Default to disabled, brands can activate via UI
  '{"description": "Send acknowledgment email when creator submits application", "webhook_variable": "N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK"}'::jsonb as configuration
FROM public.brands
ON CONFLICT (brand_id, workflow_name) DO NOTHING;

-- Update table comment
COMMENT ON TABLE public.brand_n8n_workflows IS 'Maps brands to shared n8n workflows that they can activate/deactivate';

-- Update column comments
COMMENT ON COLUMN public.brand_n8n_workflows.workflow_name IS 'Name of the shared n8n workflow (e.g., creator_application_acknowledgment)';
COMMENT ON COLUMN public.brand_n8n_workflows.is_active IS 'Whether this brand has activated this workflow';
COMMENT ON COLUMN public.brand_n8n_workflows.configuration IS 'Brand-specific configuration for the workflow'; 