-- Migration: Update response schema and prompts for better calculations
-- Created: 2025-01-31
-- Purpose: Add sitInProblemSeconds to response schema and clarify prompts

-- Update response schema to include sitInProblemSeconds
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
    'sitInProblemSeconds', jsonb_build_object(
      'type', 'number',
      'format', 'float',
      'description', 'Total seconds spent agitating the problem before introducing solution.',
      'example', 8.5
    ),
    'sitInProblem', jsonb_build_object(
      'type', 'string',
      'description', 'The percentage of the ad duration that focuses on the problem.',
      'example', '25.0%'
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
      'example', 'Product Demo, Testimonial'
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
  'required', ARRAY['type', 'adDuration', 'productIntro', 'sitInProblemSeconds', 'sitInProblem', 'creatorsUsed', 
                    'angle', 'format', 'emotion', 'framework', 'awarenessLevel', 
                    'contentVariables', 'transcription', 'visualDescription']
)
WHERE response_schema IS NOT NULL;

-- Update prompts to be clearer about measurements and calculations
UPDATE onesheet_ai_instructions
SET 
  -- Fix product intro prompt to be clearer
  product_intro_prompt = COALESCE(
    product_intro_prompt,
    'For videos, identify the exact timestamp (in seconds) when the product is FIRST shown OR mentioned. This is a specific moment, not a duration. For images, return 0.'
  ),
  -- Ensure sit in problem seconds is clear
  sit_in_problem_seconds_prompt = COALESCE(
    sit_in_problem_seconds_prompt,
    'For videos, calculate the TOTAL duration in seconds spent discussing, showing, or agitating the problem BEFORE the product/solution is introduced. This is all the time from the start until productIntro timestamp. For images, return 0.'
  ),
  -- Update sit in problem calculation to be explicit
  sit_in_problem_prompt = 'Calculate the percentage: (sitInProblemSeconds / adDuration * 100). Format as a string with one decimal place and % symbol (e.g., "25.0%", "40.5%"). For images with 0 duration, return "0%".',
  -- Update ad duration to be clear it's a number
  ad_duration_prompt = COALESCE(
    ad_duration_prompt,
    'For videos, measure the EXACT total duration in seconds as a number (e.g., 30.5 for 30.5 seconds). For images, return 0 (not "N/A").'
  ),
  -- Update creators used to ensure it returns a number
  creators_used_prompt = COALESCE(
    creators_used_prompt,
    'Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds. Return as a NUMBER (e.g., 1, 2, 3), not text.'
  ),
  -- Update content variables prompt based on return multiple setting
  content_variables_prompt = CASE 
    WHEN content_variables_return_multiple = true THEN
      'Identify ALL content variables present in the ad from the provided list. Return as a comma-separated string (e.g., "Testimonial, Product Demo, Before/After"). Include every element you observe.'
    ELSE
      'Identify the SINGLE most prominent content variable from the provided list. Choose only one that best represents the main element of the ad.'
  END
WHERE product_intro_prompt IS NULL 
   OR sit_in_problem_seconds_prompt IS NULL
   OR ad_duration_prompt LIKE '%N/A%'
   OR content_variables_prompt IS NULL;

-- Update system instructions to include better examples with sitInProblemSeconds
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
- Return numbers as actual numbers (not strings) for adDuration, productIntro, sitInProblemSeconds, creatorsUsed
- Return percentages as strings with % symbol (e.g., "25.0%")

KEY MEASUREMENTS:
- adDuration: Total length of the ad in seconds (number)
- productIntro: Timestamp when product is FIRST shown/mentioned (number)
- sitInProblemSeconds: Total time spent on problem BEFORE product intro (number)
- sitInProblem: Percentage calculated as (sitInProblemSeconds / adDuration * 100) (string with %)

IMPORTANT: Your response MUST be valid JSON and nothing else. No explanations, no markdown, just pure JSON.

Example outputs for different ad types:

Video Example (Problem-focused ad):
{
  "type": "Low Production Video (UGC)",
  "adDuration": 30.0,
  "productIntro": 12.5,
  "sitInProblemSeconds": 12.0,
  "sitInProblem": "40.0%",
  "creatorsUsed": 1,
  "angle": "Problem/Solution",
  "format": "Testimonial",
  "emotion": "Frustration to Relief",
  "framework": "PAS",
  "awarenessLevel": "Problem Aware",
  "contentVariables": "Testimonial, Product Demo",
  "transcription": "[00:00] Are you tired of waking up exhausted? [00:03] I used to drag myself out of bed every morning [00:06] Coffee wasn''t helping anymore [00:09] My productivity was suffering [00:12] Then I discovered this natural energy supplement [00:15] Just one capsule in the morning [00:18] And I feel energized all day [00:21] No crash, no jitters [00:24] Try it yourself - link below",
  "visualDescription": "Woman in pajamas looking tired at bedside, transitions to energetic morning routine. Dark to bright lighting shift at product intro. Kitchen and bedroom settings. Primary hex: #2C3E50, Secondary hex: #F39C12"
}

Image Example:
{
  "type": "Static Image",
  "adDuration": 0,
  "productIntro": 0,
  "sitInProblemSeconds": 0,
  "sitInProblem": "0%",
  "creatorsUsed": 1,
  "angle": "Before/After",
  "format": "Transformation",
  "emotion": "Hope",
  "framework": "Before After Bridge",
  "awarenessLevel": "Solution Aware",
  "contentVariables": "Before/After, Product Shots",
  "transcription": "Text overlay: Tired of Feeling Tired? | 87% More Energy in Just 7 Days | Natural Energy Support",
  "visualDescription": "Split-screen showing tired person on left, energetic person on right. Product bottle in center. Bright, clean design. Primary hex: #FFFFFF, Secondary hex: #00D4FF, Tertiary hex: #FF6B6B"
}'
WHERE system_instructions NOT LIKE '%sitInProblemSeconds%'; 