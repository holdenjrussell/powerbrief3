-- Fix n8n automation templates to use dynamic webhook paths
-- This migration updates all hardcoded webhook paths to use {{webhookPath}} variable
-- for proper brand isolation and unique webhook endpoints

-- Update Creator Application Acknowledgment template
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(node, '{parameters,path}', '"{{webhookPath}}"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'Creator Application Acknowledgment';

-- Update Creator Onboarding Email Sequence template
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(node, '{parameters,path}', '"{{webhookPath}}"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'Creator Onboarding Email Sequence';

-- Update Script Assignment Notification template
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(node, '{parameters,path}', '"{{webhookPath}}"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'Script Assignment Notification';

-- Update Content Submission Reminder template
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(node, '{parameters,path}', '"{{webhookPath}}"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'Content Submission Reminder';

-- Update the creator_application_acknowledgment template (from recent migration)
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(node, '{parameters,path}', '"{{webhookPath}}"')
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'creator_application_acknowledgment';

-- Add comment explaining the change
COMMENT ON TABLE public.n8n_automation_templates IS 'Pre-configured automation templates with dynamic webhook paths for brand isolation'; 