-- Migration: Add comprehensive prompt fields to AI instructions table
-- Created: 2025-01-31
-- Purpose: Add all prompt fields for complete control over AI analysis prompts

-- Add measurement prompt columns
ALTER TABLE onesheet_ai_instructions 
ADD COLUMN IF NOT EXISTS ad_duration_prompt TEXT,
ADD COLUMN IF NOT EXISTS product_intro_prompt TEXT,
ADD COLUMN IF NOT EXISTS creators_used_prompt TEXT,
ADD COLUMN IF NOT EXISTS sit_in_problem_prompt TEXT;

-- Add awareness and content variable prompt columns  
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS awareness_levels_prompt TEXT,
ADD COLUMN IF NOT EXISTS content_variables_prompt TEXT;

-- Add system instructions column with improved static content
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS system_instructions TEXT DEFAULT 'You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.

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
}';

-- Add protected prompt structure column with sit_in_problem included
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS protected_prompt_structure JSONB DEFAULT jsonb_build_object(
  'structure', 'Please analyze this Facebook ad creative.

Ad Details:
- Name: {{ad.name}}
- Creative Title: {{ad.creativeTitle}}
- Creative Body: {{ad.creativeBody}}
- Asset Type: {{ad.assetType}}

Follow these steps:
Step 1: First, {{assetTypeInstruction}}
Step 2: Identify the type of ad from: {{typeOptions}}
Step 3: {{durationInstruction}}
Step 4: {{productIntroInstruction}}
Step 5: {{sitInProblemInstruction}}
Step 6: {{creatorsInstruction}}
Step 7: Identify the primary angle from: {{angleOptions}}
Step 8: Identify the format from: {{formatOptions}}
Step 9: Identify the primary emotion from: {{emotionOptions}}
Step 10: Identify the framework from: {{frameworkOptions}}
Step 11: Identify awareness level from: {{awarenessOptions}}
Step 12: Identify content variables from: {{contentVariableOptions}}
Step 13: {{transcriptionInstruction}}
Step 14: {{visualDescriptionInstruction}}

Return your analysis as JSON following the exact structure specified.',
  'enabled', true
);

-- Add response schema with proper JSON Schema format
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS response_schema JSONB DEFAULT jsonb_build_object(
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
);

-- Update default values for existing prompt fields if they are null
UPDATE onesheet_ai_instructions
SET 
  type_prompt = COALESCE(type_prompt, 'Identify the ad type from: High Production Video, Low Production Video (UGC), Static Image, Carousel, GIF'),
  ad_duration_prompt = COALESCE(ad_duration_prompt, 'For videos, provide the exact duration in seconds. For images, return 0.'),
  product_intro_prompt = COALESCE(product_intro_prompt, 'For videos, identify when the product is first shown or mentioned in seconds. For images, return 0.'),
  creators_used_prompt = COALESCE(creators_used_prompt, 'Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds.'),
  angle_prompt = COALESCE(angle_prompt, 'Define the primary message or strategic focus of the ad'),
  format_prompt = COALESCE(format_prompt, 'Describe the creative execution style'),
  emotion_prompt = COALESCE(emotion_prompt, 'Identify the primary emotion the ad aims to evoke'),
  framework_prompt = COALESCE(framework_prompt, 'Identify the underlying marketing framework used'),
  transcription_prompt = COALESCE(transcription_prompt, 'For videos: provide a timecoded transcript with timestamps in [MM:SS] format. For images: extract all visible text.'),
  visual_description_prompt = COALESCE(visual_description_prompt, 'For videos: detailed description of visual elements, scenes, people, products, setting. For images: comprehensive visual description including composition, people, products, setting, mood, AND primary/secondary hex color codes.'),
  awareness_levels_prompt = COALESCE(awareness_levels_prompt, 'Identify the customer awareness level based on the ad targeting and messaging'),
  content_variables_prompt = COALESCE(content_variables_prompt, 'Identify the content variables present in the ad from the provided list'),
  sit_in_problem_prompt = COALESCE(sit_in_problem_prompt, 'This is calculated as (productIntro / adDuration * 100) formatted as a percentage')
WHERE type_prompt IS NULL 
   OR ad_duration_prompt IS NULL 
   OR product_intro_prompt IS NULL
   OR creators_used_prompt IS NULL
   OR awareness_levels_prompt IS NULL
   OR content_variables_prompt IS NULL; 