-- Set default AI instructions for Creative Brainstorm
-- This ensures all brands have proper configuration

-- Update existing brands with default Gemini instructions
UPDATE onesheet_ai_instructions
SET 
  creative_brainstorm_model = 'gemini-2.5-pro',
  creative_brainstorm_system_instructions = 'You are an expert creative strategist and advertising copywriter specializing in performance marketing. Your goal is to generate high-converting ad concepts based on data-driven insights.',
  creative_brainstorm_prompt_template = 'Based on the provided context including audience research, competitor analysis, ad performance data, and AI strategist recommendations, generate creative concepts that will resonate with the target audience and drive conversions.

Focus on:
1. Data-driven insights from high-performing ads
2. Addressing specific pain points and benefits
3. Leveraging successful angles, emotions, and frameworks
4. Creating thumb-stopping hooks and visuals
5. Optimizing for the target demographics

Prioritize recommendations based on:
1. Ad account audit data (highest priority)
2. AI strategist recommendations
3. Demographics data
4. Other context as supporting information',
  creative_brainstorm_response_schema = '{
    "type": "object",
    "properties": {
      "netNewConcepts": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "angle": {"type": "string"},
            "emotion": {"type": "string"},
            "framework": {"type": "string"},
            "awarenessLevel": {"type": "string"},
            "targetPersona": {"type": "string"},
            "duration": {"type": "number"},
            "productIntroTime": {"type": "number"},
            "sitInProblemTime": {"type": "number"},
            "creatorsCount": {"type": "number"},
            "contentVariables": {"type": "array", "items": {"type": "string"}},
            "type": {"type": "string"},
            "format": {"type": "string"},
            "rationale": {"type": "string"}
          }
        }
      },
      "iterations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "adId": {"type": "string"},
            "adName": {"type": "string"},
            "currentPerformance": {"type": "string"},
            "suggestedChanges": {"type": "array", "items": {"type": "string"}},
            "expectedImprovement": {"type": "string"},
            "rationale": {"type": "string"}
          }
        }
      },
      "hooks": {
        "type": "object",
        "properties": {
          "visual": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "hook": {"type": "string"},
                "rationale": {"type": "string"},
                "conceptId": {"type": "string"}
              }
            }
          },
          "audio": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "hook": {"type": "string"},
                "rationale": {"type": "string"},
                "conceptId": {"type": "string"}
              }
            }
          }
        }
      },
      "visuals": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": {"type": "string", "enum": ["video", "static", "carousel", "gif"]},
            "description": {"type": "string"},
            "keyElements": {"type": "array", "items": {"type": "string"}},
            "colorScheme": {"type": "string"},
            "scenes": {"type": "array", "items": {"type": "string"}},
            "conceptId": {"type": "string"},
            "duration": {"type": "number"}
          }
        }
      },
      "creativeBestPractices": {
        "type": "object",
        "properties": {
          "dos": {"type": "array", "items": {"type": "string"}},
          "donts": {"type": "array", "items": {"type": "string"}},
          "keyLearnings": {"type": "array", "items": {"type": "string"}},
          "recommendations": {"type": "array", "items": {"type": "string"}}
        }
      }
    }
  }'::jsonb
WHERE creative_brainstorm_system_instructions IS NULL 
  OR creative_brainstorm_system_instructions = '';

-- Update existing brands with default Claude instructions
UPDATE onesheet_ai_instructions
SET 
  claude_model = 'claude-sonnet-4-20250514',
  claude_system_instructions = 'You are an expert creative strategist and advertising copywriter specializing in performance marketing. Your goal is to generate high-converting ad concepts based on data-driven insights. Always respond with valid JSON only.',
  claude_prompt_template = 'Based on the provided context including audience research, competitor analysis, ad performance data, and AI strategist recommendations, generate creative concepts that will resonate with the target audience and drive conversions.

Focus on:
1. Data-driven insights from high-performing ads
2. Addressing specific pain points and benefits
3. Leveraging successful angles, emotions, and frameworks
4. Creating thumb-stopping hooks and visuals
5. Optimizing for the target demographics

Prioritize recommendations based on:
1. Ad account audit data (highest priority)
2. AI strategist recommendations
3. Demographics data
4. Other context as supporting information

Return a JSON object with this exact structure:
{
  "netNewConcepts": [...],
  "iterations": [...],
  "hooks": {
    "visual": [...],
    "audio": [...]
  },
  "visuals": [...],
  "creativeBestPractices": {
    "dos": [...],
    "donts": [...],
    "keyLearnings": [...],
    "recommendations": [...]
  }
}'
WHERE claude_system_instructions IS NULL 
  OR claude_system_instructions = '';

-- Add comment explaining the defaults
COMMENT ON COLUMN onesheet_ai_instructions.creative_brainstorm_model IS 'Default model for creative brainstorm generation (gemini-2.5-pro recommended)';
COMMENT ON COLUMN onesheet_ai_instructions.claude_model IS 'Claude model version to use (claude-sonnet-4-20250514 is Claude 4 Sonnet)'; 