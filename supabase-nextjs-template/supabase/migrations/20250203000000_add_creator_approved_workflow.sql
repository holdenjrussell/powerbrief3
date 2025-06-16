-- Add creator approved AI agent workflow to the system
-- This workflow triggers when a creator status is updated to "Approved for Next Steps"

-- Insert the new workflow configuration for existing brands
INSERT INTO public.brand_n8n_workflows (brand_id, workflow_name, is_active, configuration)
SELECT 
  id as brand_id,
  'creator_approved_for_next_steps' as workflow_name,
  false as is_active, -- Default to disabled, brands can activate via UI
  jsonb_build_object(
    'description', 'AI agent that initiates conversation when creator is approved for next steps',
    'webhook_variable', 'N8N_CREATOR_APPROVED',
    'response_webhook_variable', 'N8N_CREATOR_APPROVED_RESPONSE',
    'trigger_status', 'Approved for Next Steps',
    'category', 'AI Engagement'
  ) as configuration
FROM public.brands
ON CONFLICT (brand_id, workflow_name) DO NOTHING;

-- Add comment explaining the new workflow
COMMENT ON TABLE public.brand_n8n_workflows IS 'Maps brands to shared n8n workflows that they can activate/deactivate. Includes AI agent workflows for creator engagement.'; 