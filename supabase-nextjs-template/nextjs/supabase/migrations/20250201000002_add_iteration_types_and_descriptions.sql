-- Add iteration types and descriptions fields to onesheet_ai_instructions
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS iteration_types JSONB DEFAULT '[
  {
    "name": "Early Iterations",
    "description": "Usually the first thing we like testing are new hooks: audio hooks and visual hooks. Especially if the ad had a low Attention Rate. Another interesting variable that sometimes has an impact on performance are new voiceovers."
  },
  {
    "name": "Script Iterations", 
    "description": "USP testing, length variations for hold rate improvement. Testing different ways to present the same core message."
  },
  {
    "name": "Fine Tuning",
    "description": "Replicate winners with different creators. Take what works and test with different talent."
  },
  {
    "name": "Late Iterations",
    "description": "New angles, formats, or transformations. More significant changes to test different approaches."
  }
]'::jsonb;

-- Update existing records to have the default iteration types
UPDATE onesheet_ai_instructions 
SET iteration_types = '[
  {
    "name": "Early Iterations",
    "description": "Usually the first thing we like testing are new hooks: audio hooks and visual hooks. Especially if the ad had a low Attention Rate. Another interesting variable that sometimes has an impact on performance are new voiceovers."
  },
  {
    "name": "Script Iterations", 
    "description": "USP testing, length variations for hold rate improvement. Testing different ways to present the same core message."
  },
  {
    "name": "Fine Tuning",
    "description": "Replicate winners with different creators. Take what works and test with different talent."
  },
  {
    "name": "Late Iterations",
    "description": "New angles, formats, or transformations. More significant changes to test different approaches."
  }
]'::jsonb
WHERE iteration_types IS NULL;

-- Update strategist prompt template to use iteration types variables
UPDATE onesheet_ai_instructions
SET strategist_prompt_template = 'Analyze the following {{totalAds}} Facebook ads and provide comprehensive strategic insights.

Benchmarks for good performance:
- ROAS: {{benchmarkRoas}} or higher
- Hook Rate: {{benchmarkHookRate}}% or higher
- Hold Rate: {{benchmarkHoldRate}}% or higher
- Minimum Spend for Significance: ${{benchmarkSpend}}

Low Performer Criteria (ads that fall flat and don''t scale):
- Minimum Spend: ${{lowPerformerMinSpend}}
- Maximum Spend: ${{lowPerformerMaxSpend}}
- Maximum ROAS: {{lowPerformerMaxRoas}}

Ads Data:
{{adsData}}

Provide a comprehensive analysis including:

1. EXECUTIVE SUMMARY: A concise 2-3 sentence overview for busy executives

2. TOP PERFORMERS: Identify 3-5 ads with best spend+ROAS combination

3. WORST PERFORMERS: Identify 3-5 ads with high spend but poor ROAS

4. LOW PERFORMERS: Identify ads meeting the low performer criteria (>${{lowPerformerMinSpend}} spend, <{{lowPerformerMaxRoas}} ROAS)

5. WHAT WORKS: Specific elements that correlate with success
   - Hooks that grab attention
   - Angles that resonate
   - Formats that perform
   - Emotions that connect
   - Frameworks that convert
   - Visual elements that engage
   - Content variables that matter

6. WHAT DOESN''T WORK: Specific elements to avoid

7. CREATIVE PATTERNS: Deep analysis of winning vs losing elements

8. RECOMMENDATIONS: 5-7 specific, prioritized actions

9. NET NEW CONCEPTS: Suggest 3-5 completely new ad concepts based on learnings

10. ITERATION SUGGESTIONS: Provide {{iterationCount}} specific iteration suggestions for existing ads, categorized by the following iteration types:

{{iterationTypesDescription}}

Focus on actionable insights that can immediately improve performance.'
WHERE strategist_prompt_template IS NOT NULL;

-- Update default prompt template for new records
ALTER TABLE onesheet_ai_instructions
ALTER COLUMN strategist_prompt_template SET DEFAULT 'Analyze the following {{totalAds}} Facebook ads and provide comprehensive strategic insights.

Benchmarks for good performance:
- ROAS: {{benchmarkRoas}} or higher
- Hook Rate: {{benchmarkHookRate}}% or higher
- Hold Rate: {{benchmarkHoldRate}}% or higher
- Minimum Spend for Significance: ${{benchmarkSpend}}

Low Performer Criteria (ads that fall flat and don''t scale):
- Minimum Spend: ${{lowPerformerMinSpend}}
- Maximum Spend: ${{lowPerformerMaxSpend}}
- Maximum ROAS: {{lowPerformerMaxRoas}}

Ads Data:
{{adsData}}

Provide a comprehensive analysis including:

1. EXECUTIVE SUMMARY: A concise 2-3 sentence overview for busy executives

2. TOP PERFORMERS: Identify 3-5 ads with best spend+ROAS combination

3. WORST PERFORMERS: Identify 3-5 ads with high spend but poor ROAS

4. LOW PERFORMERS: Identify ads meeting the low performer criteria (>${{lowPerformerMinSpend}} spend, <{{lowPerformerMaxRoas}} ROAS)

5. WHAT WORKS: Specific elements that correlate with success
   - Hooks that grab attention
   - Angles that resonate
   - Formats that perform
   - Emotions that connect
   - Frameworks that convert
   - Visual elements that engage
   - Content variables that matter

6. WHAT DOESN''T WORK: Specific elements to avoid

7. CREATIVE PATTERNS: Deep analysis of winning vs losing elements

8. RECOMMENDATIONS: 5-7 specific, prioritized actions

9. NET NEW CONCEPTS: Suggest 3-5 completely new ad concepts based on learnings

10. ITERATION SUGGESTIONS: Provide {{iterationCount}} specific iteration suggestions for existing ads, categorized by the following iteration types:

{{iterationTypesDescription}}

Focus on actionable insights that can immediately improve performance.'; 