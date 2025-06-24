-- Migration: Fix master prompt template completeness 
-- Created: 2025-01-31
-- Purpose: Ensure master prompt template includes all required fields and matches response schema

-- Update master prompt template to be complete and include all required fields
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
- ALL fields are REQUIRED - do not omit any field
- Use numbers (not strings) for: adDuration, productIntro, sitInProblemSeconds, creatorsUsed
- Use percentage strings (e.g., "25.0%") for: sitInProblem
- Include exact hex color codes in visualDescription
- For contentVariables: {{contentVariablesOutputFormat}}

REQUIRED JSON FIELDS (all must be present):
{
  "type": "string value from options",
  "adDuration": number_in_seconds,
  "productIntro": number_timestamp_in_seconds,
  "sitInProblemSeconds": number_duration_in_seconds,
  "sitInProblem": "percentage_string_with_%",
  "creatorsUsed": integer_count,
  "angle": "string value from options", 
  "format": "string value from options",
  "emotion": "string value from options",
  "framework": "string value from options",
  "awarenessLevel": "string value from options",
  "contentVariables": "string value(s) from options",
  "transcription": "full transcription text",
  "visualDescription": "detailed visual description with hex codes"
}'
WHERE master_prompt_template IS NOT NULL;

-- Also update the column default to match
ALTER TABLE onesheet_ai_instructions
ALTER COLUMN master_prompt_template SET DEFAULT 'Please analyze this Facebook ad creative comprehensively.

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
- ALL fields are REQUIRED - do not omit any field
- Use numbers (not strings) for: adDuration, productIntro, sitInProblemSeconds, creatorsUsed
- Use percentage strings (e.g., "25.0%") for: sitInProblem
- Include exact hex color codes in visualDescription
- For contentVariables: {{contentVariablesOutputFormat}}

REQUIRED JSON FIELDS (all must be present):
{
  "type": "string value from options",
  "adDuration": number_in_seconds,
  "productIntro": number_timestamp_in_seconds,
  "sitInProblemSeconds": number_duration_in_seconds,
  "sitInProblem": "percentage_string_with_%",
  "creatorsUsed": integer_count,
  "angle": "string value from options", 
  "format": "string value from options",
  "emotion": "string value from options",
  "framework": "string value from options",
  "awarenessLevel": "string value from options",
  "contentVariables": "string value(s) from options",
  "transcription": "full transcription text",
  "visualDescription": "detailed visual description with hex codes"
}'; 