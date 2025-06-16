-- Update n8n automation template to use shared webhook approach
-- This removes brand-specific webhook paths and uses a single shared workflow

-- Update the creator_application_acknowledgment template to use shared webhook path
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN jsonb_set(
          node,
          '{parameters,path}',
          '"powerbrief-creator-application-acknowledgment"'::jsonb
        )
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'creator_application_acknowledgment';

-- Add comment explaining the shared approach
COMMENT ON TABLE public.n8n_automation_templates IS 'Templates for n8n workflows. Uses shared workflows where brand-specific data is passed in webhook payload rather than creating separate workflows per brand.'; 