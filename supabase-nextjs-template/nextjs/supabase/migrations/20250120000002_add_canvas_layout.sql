-- Add canvas layout support to workflow templates
ALTER TABLE ugc_workflow_templates 
ADD COLUMN canvas_layout JSONB DEFAULT NULL;

-- Add canvas position support to workflow steps  
ALTER TABLE ugc_workflow_steps
ADD COLUMN canvas_position JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN ugc_workflow_templates.canvas_layout IS 'Stores canvas layout including node positions and manual connections';
COMMENT ON COLUMN ugc_workflow_steps.canvas_position IS 'Stores x,y coordinates for step positioning on canvas'; 