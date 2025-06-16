-- Update n8n automation template to use dynamic webhook path and remove hardcoded JWT credentials
-- This fixes the "jwt malformed" error by allowing proper credential mapping

-- Update the creator_application_acknowledgment template
UPDATE public.n8n_automation_templates 
SET workflow_definition = jsonb_set(
  jsonb_set(
    workflow_definition,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE 
          WHEN node->>'type' = 'n8n-nodes-base.webhook' 
          THEN jsonb_set(
            node #- '{credentials}',  -- Remove hardcoded credentials
            '{parameters,path}',
            '"{{webhookPath}}"'::jsonb  -- Use dynamic webhook path
          )
          ELSE node
        END
      )
      FROM jsonb_array_elements(workflow_definition->'nodes') AS node
    )
  ),
  '{name}',
  '"PowerBrief Creator Application Acknowledgment"'::jsonb
)
WHERE name = 'creator_application_acknowledgment';

-- Add comment explaining the fix
COMMENT ON TABLE public.n8n_automation_templates IS 'Pre-configured automation templates with dynamic webhook paths and environment-based credentials. JWT credentials are mapped at runtime using N8N_JWT_CREDENTIAL_NAME environment variable.'; 