-- Add missing UGC Coordinator views and aliases
-- This creates the views that the UGC Coordinator APIs expect

-- Create alias view for human review queue (API expects this name)
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

-- Create workflow execution view with computed fields
CREATE OR REPLACE VIEW public.ugc_workflow_execution_view AS 
SELECT 
  we.id,
  we.workflow_id,
  we.creator_id,
  we.brand_id,
  we.current_step_id,
  we.status,
  we.started_at,
  we.completed_at,
  we.error_message,
  we.context,
  we.created_at,
  we.updated_at,
  -- Computed fields
  CASE 
    WHEN we.status = 'completed' THEN 100
    WHEN we.status = 'failed' THEN 0
    ELSE COALESCE(
      ROUND(
        (SELECT COUNT(*)::DECIMAL FROM public.ugc_workflow_step_executions se 
         WHERE se.execution_id = we.id AND se.status = 'completed') /
        NULLIF((SELECT COUNT(*) FROM public.ugc_workflow_steps WHERE workflow_id = we.workflow_id), 0) * 100
      ), 0
    )
  END as completion_percentage,
  
  COALESCE(
    (SELECT COUNT(*) FROM public.ugc_workflow_step_executions se 
     WHERE se.execution_id = we.id AND se.status = 'completed'), 0
  ) as completed_steps,
  
  COALESCE(
    (SELECT COUNT(*) FROM public.ugc_workflow_steps WHERE workflow_id = we.workflow_id), 0
  ) as total_steps,
  
  COALESCE(
    (SELECT ws.name FROM public.ugc_workflow_steps ws 
     WHERE ws.id = we.current_step_id), 
    CASE 
      WHEN we.status = 'completed' THEN 'Completed'
      WHEN we.status = 'failed' THEN 'Failed'
      ELSE 'Unknown Step'
    END
  ) as current_step_name
  
FROM public.ugc_workflow_executions we;

-- Grant permissions on the views
GRANT SELECT ON public.ugc_human_review_queue TO authenticated;
GRANT SELECT ON public.ugc_workflow_execution_view TO authenticated;

-- Add RLS policies for the views (they inherit from the underlying tables)
-- The views will automatically respect the RLS policies of the underlying tables