-- Fix n8n automation templates to use environment-based credential names
-- This migration removes hardcoded credential IDs and prepares templates for proper credential mapping

-- Update all templates to remove hardcoded credential IDs
-- The N8nService will handle credential mapping at runtime based on environment variables

-- Remove hardcoded credentials from all webhook nodes
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN node #- '{credentials}'  -- Remove credentials object
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
);

-- Remove hardcoded credentials from all HTTP request nodes
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.httpRequest' 
        THEN node #- '{credentials}'  -- Remove credentials object
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
);

-- Add comment explaining the credential strategy
COMMENT ON TABLE public.n8n_automation_templates IS 'Pre-configured automation templates with dynamic webhook paths and environment-based credentials for brand isolation and security'; 