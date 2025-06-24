-- Migration: Update existing onesheet AI instructions with new defaults
-- Created: 2025-01-31
-- Purpose: Update all existing brand onesheet instructions to use new prompt defaults

-- First, update any NULL system instructions with the new default
UPDATE onesheet_ai_instructions
SET system_instructions = 'You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.

Your core task is to analyze Facebook ad creatives and extract structured information about their content, performance indicators, and marketing strategies.

IMPORTANT CONSTRAINTS:
- Always analyze based on what you can see in the visual content
- Do not make assumptions about elements not visible in the ad
- For videos, watch the entire content before analyzing
- For images, examine all visual elements including text overlays
- Provide exact timestamps for video content
- Include hex color codes for visual descriptions
- Return numbers as actual numbers (not strings) for adDuration, productIntro, creatorsUsed
- Return percentages as strings with % symbol (e.g., "9.5%")

IMPORTANT: Your response MUST be valid JSON and nothing else. No explanations, no markdown, just pure JSON.

Example outputs for different ad types:

Video Example:
{
  "type": "Low Production Video (UGC)",
  "adDuration": 15.0,
  "productIntro": 2.5,
  "sitInProblem": "16.7%",
  "creatorsUsed": 1,
  "angle": "Time/Convenience",
  "format": "Testimonial",
  "emotion": "Excitement",
  "framework": "Before After Bridge",
  "awarenessLevel": "Solution Aware",
  "contentVariables": "Testimonial, Product Demo",
  "transcription": "[00:00] I used to spend hours meal prepping [00:02] Then I found this amazing supplement [00:05] Now I just mix it in my morning smoothie [00:08] And I have energy all day long [00:10] Plus I have lost 10 pounds [00:12] Try it yourself - link in bio",
  "visualDescription": "Young woman in casual home setting speaking directly to camera. Kitchen background with modern appliances. Product shown at 00:02 in close-up. Bright natural lighting. Primary hex: #F5E6D3, Secondary hex: #8B7355"
}

Image Example:
{
  "type": "Static Image",
  "adDuration": 0,
  "productIntro": 0,
  "sitInProblem": "0%",
  "creatorsUsed": 2,
  "angle": "Social Proof",
  "format": "Before/After",
  "emotion": "Trust",
  "framework": "FAB",
  "awarenessLevel": "Product Aware",
  "contentVariables": "Product Shots",
  "transcription": "Text overlay: Lost 47 lbs in 3 months! Real Results from Real People Join 10,000+ Happy Customers",
  "visualDescription": "Split image showing before/after transformation. Left side shows woman in loose clothing, right side in fitted dress. Product bottle prominently displayed in center. Clean white background with subtle shadow. Primary hex: #FFFFFF, Secondary hex: #FF6B6B, Tertiary hex: #4ECDC4"
}'
WHERE system_instructions IS NULL;

-- Update measurement prompts with new defaults
UPDATE onesheet_ai_instructions
SET 
  ad_duration_prompt = 'For videos, provide the exact duration in seconds as a number. For images, return 0.',
  product_intro_prompt = 'For videos, identify the exact timestamp (in seconds) when the product is first shown or mentioned. For images, return 0.',
  creators_used_prompt = 'Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds. Return as a number.',
  sit_in_problem_prompt = 'Calculate as (productIntro / adDuration * 100) and format as a percentage string with % symbol (e.g., "9.5%")'
WHERE ad_duration_prompt IS NULL 
   OR product_intro_prompt IS NULL
   OR creators_used_prompt IS NULL
   OR sit_in_problem_prompt IS NULL;

-- Update awareness and content variable prompts
UPDATE onesheet_ai_instructions
SET
  awareness_levels_prompt = 'Identify the customer awareness level based on the ad targeting and messaging. Choose from the provided options.',
  content_variables_prompt = 'Identify ALL content variables present in the ad from the provided list. You may select multiple variables if they apply.'
WHERE awareness_levels_prompt IS NULL
   OR content_variables_prompt IS NULL;

-- Update the response schema for all records
UPDATE onesheet_ai_instructions
SET response_schema = jsonb_build_object(
  'type', 'object',
  'properties', jsonb_build_object(
    'type', jsonb_build_object(
      'type', 'string',
      'description', 'The category of the video production.',
      'example', 'High Production Video'
    ),
    'adDuration', jsonb_build_object(
      'type', 'number',
      'format', 'float',
      'description', 'The total duration of the ad in seconds.',
      'example', 32.5
    ),
    'productIntro', jsonb_build_object(
      'type', 'number',
      'format', 'float',
      'description', 'The timestamp in seconds when the product is introduced.',
      'example', 3.1
    ),
    'sitInProblem', jsonb_build_object(
      'type', 'string',
      'description', 'The percentage of the ad duration that focuses on the problem.',
      'example', '9.5%'
    ),
    'creatorsUsed', jsonb_build_object(
      'type', 'integer',
      'description', 'The number of creators featured in the ad.',
      'example', 1
    ),
    'angle', jsonb_build_object(
      'type', 'string',
      'description', 'The primary marketing angle or theme of the ad.',
      'example', 'Weight Management'
    ),
    'format', jsonb_build_object(
      'type', 'string',
      'description', 'The format of the ad.',
      'example', 'Testimonial'
    ),
    'emotion', jsonb_build_object(
      'type', 'string',
      'description', 'The dominant emotion conveyed in the ad.',
      'example', 'Hopefulness'
    ),
    'framework', jsonb_build_object(
      'type', 'string',
      'description', 'The marketing or storytelling framework used.',
      'example', 'PAS'
    ),
    'awarenessLevel', jsonb_build_object(
      'type', 'string',
      'description', 'The target audience''s level of awareness.',
      'example', 'Problem Aware'
    ),
    'contentVariables', jsonb_build_object(
      'type', 'string',
      'description', 'Specific elements or variables included in the content.',
      'example', 'Product Demo'
    ),
    'transcription', jsonb_build_object(
      'type', 'string',
      'description', 'The full transcription of the ad''s audio.',
      'example', '[00:01] Have you ever felt...'
    ),
    'visualDescription', jsonb_build_object(
      'type', 'string',
      'description', 'A description of the visual elements in the ad.',
      'example', 'A woman is sitting at her desk, looking tired. The color palette is muted with blue and grey tones. Primary hex code: #B0C4DE.'
    )
  ),
  'required', ARRAY['type', 'adDuration', 'productIntro', 'sitInProblem', 'creatorsUsed', 
                    'angle', 'format', 'emotion', 'framework', 'awarenessLevel', 
                    'contentVariables', 'transcription', 'visualDescription']
)
WHERE response_schema IS NULL;

-- Remove the protected_prompt_structure column as it's no longer needed
ALTER TABLE onesheet_ai_instructions
DROP COLUMN IF EXISTS protected_prompt_structure; 