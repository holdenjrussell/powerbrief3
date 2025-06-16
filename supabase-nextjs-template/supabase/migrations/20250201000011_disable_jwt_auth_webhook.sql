-- Disable JWT authentication from n8n webhook template
-- This removes all authentication requirements to get the webhook working

-- Update the creator_application_acknowledgment template to remove JWT auth
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  workflow_definition,
  '{nodes}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN node->>'type' = 'n8n-nodes-base.webhook' 
        THEN (
          node 
          #- '{credentials}'  -- Remove credentials
          #- '{parameters,authentication}'  -- Remove authentication parameter
        )
        ELSE node
      END
    )
    FROM jsonb_array_elements(workflow_definition->'nodes') AS node
  )
)
WHERE name = 'creator_application_acknowledgment';

-- Add comment explaining the change
COMMENT ON TABLE public.n8n_automation_templates IS 'Pre-configured automation templates with dynamic webhook paths. JWT authentication disabled for simplified webhook access.'; 