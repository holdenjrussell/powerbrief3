-- Add AI strategist opinion column to onesheet table
ALTER TABLE onesheet 
ADD COLUMN IF NOT EXISTS ai_strategist_opinion JSONB;

-- Add benchmark fields and strategist prompt fields to onesheet_ai_instructions
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS benchmark_roas DECIMAL(10,2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS benchmark_hook_rate DECIMAL(5,2) DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS benchmark_hold_rate DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS benchmark_spend DECIMAL(10,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS strategist_system_instructions TEXT,
ADD COLUMN IF NOT EXISTS strategist_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS strategist_response_schema JSONB;

-- Set default strategist system instructions
UPDATE onesheet_ai_instructions
SET strategist_system_instructions = 'You are a world-class performance marketing strategist with deep expertise in Facebook/Meta advertising. You analyze ad performance data to identify patterns and provide actionable insights. Your analysis is data-driven, focusing on the relationship between creative elements and business outcomes. You prioritize spend volume as the primary indicator of platform algorithm preference, while considering ROAS as the efficiency metric. Your goal is to help brands understand what creative elements drive both high spend (indicating strong engagement) and profitable returns.'
WHERE strategist_system_instructions IS NULL;

-- Set default strategist prompt template
UPDATE onesheet_ai_instructions
SET strategist_prompt_template = 'Analyze the performance of these Facebook ads to determine what creative elements contribute to success or failure.

PERFORMANCE BENCHMARKS:
- Target ROAS: {{benchmarkRoas}}
- Target Hook Rate: {{benchmarkHookRate}}%
- Target Hold Rate: {{benchmarkHoldRate}}%
- Target Daily Spend: ${{benchmarkSpend}}

AD PERFORMANCE DATA:
{{adsData}}

For each ad, you have access to:
- All creative analysis data (type, angle, format, emotion, framework, content variables, etc.)
- Performance metrics (spend, ROAS, hook rate, hold rate, CTR, CPM, etc.)
- Ad content (transcription, visual description, product intro %, sit-in-problem %)

ANALYSIS REQUIREMENTS:
1. Identify the top performing ads (high spend + good ROAS)
2. Identify the worst performing ads (low spend and/or poor ROAS)
3. Find patterns in creative elements that correlate with performance
4. Provide specific, actionable recommendations

Focus on:
- Which creative types, angles, and formats drive the most spend?
- What emotional approaches and frameworks correlate with high ROAS?
- Are there content variables that consistently appear in winners?
- What is the optimal sit-in-problem vs product intro ratio?
- Which hooks work best for this brand?

Remember: High spend indicates the algorithm finds the ad engaging. Combine this with ROAS to identify truly successful ads.'
WHERE strategist_prompt_template IS NULL;

-- Set default strategist response schema
UPDATE onesheet_ai_instructions
SET strategist_response_schema = jsonb_build_object(
  'type', 'object',
  'properties', jsonb_build_object(
    'summary', jsonb_build_object(
      'type', 'string',
      'description', 'Executive summary of key findings'
    ),
    'topPerformers', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'spend', jsonb_build_object('type', 'number'),
          'roas', jsonb_build_object('type', 'number'),
          'keySuccessFactors', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
        )
      )
    ),
    'worstPerformers', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'adId', jsonb_build_object('type', 'string'),
          'adName', jsonb_build_object('type', 'string'),
          'spend', jsonb_build_object('type', 'number'),
          'roas', jsonb_build_object('type', 'number'),
          'failureReasons', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
        )
      )
    ),
    'creativePatterns', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'winningElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'losingElements', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string')),
        'optimalSitInProblemRange', jsonb_build_object('type', 'string'),
        'bestPerformingHooks', jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'))
      )
    ),
    'recommendations', jsonb_build_object(
      'type', 'array',
      'items', jsonb_build_object(
        'type', 'object',
        'properties', jsonb_build_object(
          'priority', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('high', 'medium', 'low')),
          'recommendation', jsonb_build_object('type', 'string'),
          'expectedImpact', jsonb_build_object('type', 'string')
        )
      )
    )
  ),
  'required', jsonb_build_array('summary', 'topPerformers', 'worstPerformers', 'creativePatterns', 'recommendations')
)
WHERE strategist_response_schema IS NULL; 