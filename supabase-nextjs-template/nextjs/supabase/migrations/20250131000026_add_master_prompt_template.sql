-- Migration: Add master prompt template to AI instructions
-- Created: 2025-01-31
-- Purpose: Store the entire prompt structure in database to eliminate hardcoding

-- Add master prompt template column
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS master_prompt_template TEXT;

-- Set default master prompt template using placeholders
UPDATE onesheet_ai_instructions
SET master_prompt_template = 'Please analyze this Facebook ad creative comprehensively.

AD CONTEXT:
- Name: {{ad.name}}
- Creative Title: {{ad.creativeTitle}}
- Creative Body: {{ad.creativeBody}}
- Asset Type: {{ad.assetType}}

ANALYSIS INSTRUCTIONS:

1. MEDIA ANALYSIS: {{mediaAnalysisInstruction}}

2. TYPE IDENTIFICATION: {{type_prompt}}
   Options: {{typeOptions}}

3. DURATION MEASUREMENT: {{ad_duration_prompt}}

4. PRODUCT INTRODUCTION: {{product_intro_prompt}}

5. PROBLEM AGITATION DURATION: {{sit_in_problem_seconds_prompt}}

6. PROBLEM PERCENTAGE: {{sit_in_problem_prompt}}

7. CREATOR COUNT: {{creators_used_prompt}}

8. ANGLE ANALYSIS: {{angle_prompt}}
   Options: {{angleOptions}}

9. FORMAT IDENTIFICATION: {{format_prompt}}
   Options: {{formatOptions}}

10. EMOTION DETECTION: {{emotion_prompt}}
    Options: {{emotionOptions}}

11. FRAMEWORK ANALYSIS: {{framework_prompt}}
    Options: {{frameworkOptions}}

12. AWARENESS LEVEL: {{awareness_levels_prompt}}
    Options: {{awarenessOptions}}

13. CONTENT VARIABLES: {{content_variables_prompt}}
    Options: {{contentVariablesOptions}}
    Instructions: {{contentVariablesInstruction}}

14. TRANSCRIPTION: {{transcription_prompt}}

15. VISUAL DESCRIPTION: {{visual_description_prompt}}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching the exact schema
- Use numbers (not strings) for: adDuration, productIntro, sitInProblemSeconds, creatorsUsed
- Use percentage strings (e.g., "25.0%") for: sitInProblem
- Include exact hex color codes in visualDescription
- For contentVariables: {{contentVariablesOutputFormat}}'
WHERE master_prompt_template IS NULL;

-- Add comment
COMMENT ON COLUMN onesheet_ai_instructions.master_prompt_template IS 'Template for the master prompt sent to Gemini. Uses {{placeholder}} syntax for variable substitution.'; 