-- Add separate prompts and system instructions for each creative brainstorm type
-- This allows for more targeted and effective AI generation

-- Add fields for Gemini models (with response schemas)
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS creative_brainstorm_concepts_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_concepts_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_concepts_response_schema JSONB,
ADD COLUMN IF NOT EXISTS creative_brainstorm_iterations_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_iterations_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_iterations_response_schema JSONB,
ADD COLUMN IF NOT EXISTS creative_brainstorm_hooks_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_hooks_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_hooks_response_schema JSONB,
ADD COLUMN IF NOT EXISTS creative_brainstorm_visuals_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_visuals_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_visuals_response_schema JSONB,
ADD COLUMN IF NOT EXISTS creative_brainstorm_practices_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_practices_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS creative_brainstorm_practices_response_schema JSONB;

-- Add fields for Claude models (response structure in system instructions)
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS claude_concepts_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS claude_concepts_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS claude_iterations_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS claude_iterations_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS claude_hooks_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS claude_hooks_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS claude_visuals_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS claude_visuals_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS claude_practices_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS claude_practices_prompt_template TEXT;

-- Set default values for existing brands
UPDATE onesheet_ai_instructions
SET 
  -- Concepts
  creative_brainstorm_concepts_system_instructions = COALESCE(creative_brainstorm_concepts_system_instructions, 
    'You are an expert creative strategist specializing in performance marketing. Generate innovative ad concepts based on data-driven insights.'),
  creative_brainstorm_concepts_prompt_template = COALESCE(creative_brainstorm_concepts_prompt_template,
    'Based on the provided context, generate 5-7 net new creative concepts that will resonate with the target audience. Each concept should be distinct and leverage different angles, emotions, and frameworks.'),
  creative_brainstorm_concepts_response_schema = COALESCE(creative_brainstorm_concepts_response_schema,
    '{"netNewConcepts": [{"id": "string", "name": "string", "angle": "string", "targetPersona": "string", "emotion": "string", "framework": "string", "awarenessLevel": "string", "description": "string", "duration": "number", "productIntroTime": "number", "sitInProblemTime": "number", "creatorsCount": "number", "contentVariables": ["string"], "type": "string", "format": "string"}]}'::jsonb),
  
  -- Iterations
  creative_brainstorm_iterations_system_instructions = COALESCE(creative_brainstorm_iterations_system_instructions,
    'You are an expert at optimizing ad performance through strategic iterations. Analyze existing ads and suggest specific improvements.'),
  creative_brainstorm_iterations_prompt_template = COALESCE(creative_brainstorm_iterations_prompt_template,
    'Analyze the selected ads and suggest specific iterations for each based on their current performance. Categorize suggestions as early, script, fine_tuning, or late iterations.'),
  creative_brainstorm_iterations_response_schema = COALESCE(creative_brainstorm_iterations_response_schema,
    '{"iterations": [{"adId": "string", "adName": "string", "iterationType": "early|script|fine_tuning|late", "suggestion": "string", "expectedImpact": "string"}]}'::jsonb),
  
  -- Hooks
  creative_brainstorm_hooks_system_instructions = COALESCE(creative_brainstorm_hooks_system_instructions,
    'You are an expert copywriter specializing in attention-grabbing hooks for social media ads. Create hooks that stop the scroll.'),
  creative_brainstorm_hooks_prompt_template = COALESCE(creative_brainstorm_hooks_prompt_template,
    'Generate compelling visual and audio hooks based on the provided context. Visual hooks are text overlays, audio hooks are spoken words in the first 3 seconds.'),
  creative_brainstorm_hooks_response_schema = COALESCE(creative_brainstorm_hooks_response_schema,
    '{"hooks": {"visual": [{"id": "string", "hook": "string", "conceptId": "string", "rationale": "string"}], "audio": [{"id": "string", "hook": "string", "conceptId": "string", "rationale": "string"}]}}'::jsonb),
  
  -- Visuals
  creative_brainstorm_visuals_system_instructions = COALESCE(creative_brainstorm_visuals_system_instructions,
    'You are an expert visual creative director. Generate detailed visual concepts for ads including shots, scenes, and aesthetic direction.'),
  creative_brainstorm_visuals_prompt_template = COALESCE(creative_brainstorm_visuals_prompt_template,
    'Create detailed visual concepts for the generated creative ideas. Include type, scenes, color schemes, and key visual elements.'),
  creative_brainstorm_visuals_response_schema = COALESCE(creative_brainstorm_visuals_response_schema,
    '{"visuals": [{"id": "string", "conceptId": "string", "type": "video|static|carousel|gif", "description": "string", "scenes": ["string"], "colorScheme": "string", "keyElements": ["string"], "duration": "number"}]}'::jsonb),
  
  -- Best Practices
  creative_brainstorm_practices_system_instructions = COALESCE(creative_brainstorm_practices_system_instructions,
    'You are an expert at analyzing ad performance patterns and extracting actionable best practices.'),
  creative_brainstorm_practices_prompt_template = COALESCE(creative_brainstorm_practices_prompt_template,
    'Based on the performance data and analysis, extract key best practices including dos, donts, learnings, and recommendations.'),
  creative_brainstorm_practices_response_schema = COALESCE(creative_brainstorm_practices_response_schema,
    '{"creativeBestPractices": {"dos": ["string"], "donts": ["string"], "keyLearnings": ["string"], "recommendations": ["string"]}}'::jsonb),
  
  -- Claude versions
  claude_concepts_system_instructions = COALESCE(claude_concepts_system_instructions,
    'You are an expert creative strategist specializing in performance marketing. Generate innovative ad concepts based on data-driven insights. Return your response as valid JSON with this structure: {"netNewConcepts": [{"id": "string", "name": "string", "angle": "string", "targetPersona": "string", "emotion": "string", "framework": "string", "awarenessLevel": "string", "description": "string", "duration": number, "productIntroTime": number, "sitInProblemTime": number, "creatorsCount": number, "contentVariables": ["string"], "type": "string", "format": "string"}]}'),
  claude_concepts_prompt_template = COALESCE(claude_concepts_prompt_template, creative_brainstorm_concepts_prompt_template),
  
  claude_iterations_system_instructions = COALESCE(claude_iterations_system_instructions,
    'You are an expert at optimizing ad performance through strategic iterations. Analyze existing ads and suggest specific improvements. Return your response as valid JSON with this structure: {"iterations": [{"adId": "string", "adName": "string", "iterationType": "early|script|fine_tuning|late", "suggestion": "string", "expectedImpact": "string"}]}'),
  claude_iterations_prompt_template = COALESCE(claude_iterations_prompt_template, creative_brainstorm_iterations_prompt_template),
  
  claude_hooks_system_instructions = COALESCE(claude_hooks_system_instructions,
    'You are an expert copywriter specializing in attention-grabbing hooks for social media ads. Create hooks that stop the scroll. Return your response as valid JSON with this structure: {"hooks": {"visual": [{"id": "string", "hook": "string", "conceptId": "string", "rationale": "string"}], "audio": [{"id": "string", "hook": "string", "conceptId": "string", "rationale": "string"}]}}'),
  claude_hooks_prompt_template = COALESCE(claude_hooks_prompt_template, creative_brainstorm_hooks_prompt_template),
  
  claude_visuals_system_instructions = COALESCE(claude_visuals_system_instructions,
    'You are an expert visual creative director. Generate detailed visual concepts for ads including shots, scenes, and aesthetic direction. Return your response as valid JSON with this structure: {"visuals": [{"id": "string", "conceptId": "string", "type": "video|static|carousel|gif", "description": "string", "scenes": ["string"], "colorScheme": "string", "keyElements": ["string"], "duration": number}]}'),
  claude_visuals_prompt_template = COALESCE(claude_visuals_prompt_template, creative_brainstorm_visuals_prompt_template),
  
  claude_practices_system_instructions = COALESCE(claude_practices_system_instructions,
    'You are an expert at analyzing ad performance patterns and extracting actionable best practices. Return your response as valid JSON with this structure: {"creativeBestPractices": {"dos": ["string"], "donts": ["string"], "keyLearnings": ["string"], "recommendations": ["string"]}}'),
  claude_practices_prompt_template = COALESCE(claude_practices_prompt_template, creative_brainstorm_practices_prompt_template)
WHERE creative_brainstorm_concepts_system_instructions IS NULL; 