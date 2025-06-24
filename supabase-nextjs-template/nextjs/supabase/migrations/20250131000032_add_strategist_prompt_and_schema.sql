-- Add strategist prompt template and response schema fields
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS strategist_prompt_template TEXT,
ADD COLUMN IF NOT EXISTS strategist_response_schema JSONB,
ADD COLUMN IF NOT EXISTS analyze_model TEXT DEFAULT 'gemini-2.5-flash-lite-preview-06-17',
ADD COLUMN IF NOT EXISTS strategist_model TEXT DEFAULT 'gemini-2.5-pro';

-- Set default strategist prompt template for existing records
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

10. ITERATION SUGGESTIONS: Provide {{iterationCount}} specific iteration suggestions for existing ads, categorized by type:
    - Early Iterations: New hooks (audio/visual) for low attention rates
    - Script Iterations: USP testing, length variations for hold rate improvement
    - Fine Tuning: Replicate winners with different creators
    - Late Iterations: New angles, formats, or transformations

Focus on actionable insights that can immediately improve performance.'
WHERE strategist_prompt_template IS NULL;

-- Set default strategist response schema
UPDATE onesheet_ai_instructions
SET strategist_response_schema = '{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "executiveSummary": { "type": "string" },
    "topPerformers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adId": { "type": "string" },
          "adName": { "type": "string" },
          "spend": { "type": "number" },
          "roas": { "type": "number" },
          "keySuccessFactors": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["adId", "adName", "spend", "roas", "keySuccessFactors"]
      }
    },
    "worstPerformers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adId": { "type": "string" },
          "adName": { "type": "string" },
          "spend": { "type": "number" },
          "roas": { "type": "number" },
          "failureReasons": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["adId", "adName", "spend", "roas", "failureReasons"]
      }
    },
    "lowPerformers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adId": { "type": "string" },
          "adName": { "type": "string" },
          "spend": { "type": "number" },
          "roas": { "type": "number" },
          "issues": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["adId", "adName", "spend", "roas", "issues"]
      }
    },
    "whatWorks": {
      "type": "object",
      "properties": {
        "hooks": { "type": "array", "items": { "type": "string" } },
        "angles": { "type": "array", "items": { "type": "string" } },
        "formats": { "type": "array", "items": { "type": "string" } },
        "emotions": { "type": "array", "items": { "type": "string" } },
        "frameworks": { "type": "array", "items": { "type": "string" } },
        "visualElements": { "type": "array", "items": { "type": "string" } },
        "contentVariables": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["hooks", "angles", "formats", "emotions", "frameworks", "visualElements", "contentVariables"]
    },
    "whatDoesntWork": {
      "type": "object",
      "properties": {
        "hooks": { "type": "array", "items": { "type": "string" } },
        "angles": { "type": "array", "items": { "type": "string" } },
        "formats": { "type": "array", "items": { "type": "string" } },
        "emotions": { "type": "array", "items": { "type": "string" } },
        "frameworks": { "type": "array", "items": { "type": "string" } },
        "visualElements": { "type": "array", "items": { "type": "string" } },
        "contentVariables": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["hooks", "angles", "formats", "emotions", "frameworks", "visualElements", "contentVariables"]
    },
    "creativePatterns": {
      "type": "object",
      "properties": {
        "winningElements": { "type": "array", "items": { "type": "string" } },
        "losingElements": { "type": "array", "items": { "type": "string" } },
        "optimalSitInProblemRange": { "type": "string" },
        "bestPerformingHooks": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["winningElements", "losingElements", "optimalSitInProblemRange", "bestPerformingHooks"]
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "priority": { "type": "string" },
          "recommendation": { "type": "string" },
          "expectedImpact": { "type": "string" }
        },
        "required": ["priority", "recommendation", "expectedImpact"]
      }
    },
    "netNewConcepts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "type": { "type": "string" },
          "duration": { "type": "string" },
          "productIntroSuggestion": { "type": "string" },
          "sitInProblemSuggestion": { "type": "string" },
          "creatorsNeeded": { "type": "number" },
          "angle": { "type": "string" },
          "awarenessLevel": { "type": "string" },
          "contentVariables": { "type": "array", "items": { "type": "string" } },
          "format": { "type": "string" },
          "emotion": { "type": "string" },
          "framework": { "type": "string" },
          "hookSuggestions": { "type": "array", "items": { "type": "string" } },
          "visualNotes": { "type": "string" }
        },
        "required": ["title", "description", "type", "duration", "productIntroSuggestion", 
                    "sitInProblemSuggestion", "creatorsNeeded", "angle", "awarenessLevel", 
                    "contentVariables", "format", "emotion", "framework", "hookSuggestions", "visualNotes"]
      }
    },
    "iterationSuggestions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adId": { "type": "string" },
          "adName": { "type": "string" },
          "currentPerformance": {
            "type": "object",
            "properties": {
              "spend": { "type": "number" },
              "roas": { "type": "number" },
              "hookRate": { "type": "number" },
              "holdRate": { "type": "number" }
            },
            "required": ["spend", "roas", "hookRate", "holdRate"]
          },
          "iterationType": { "type": "string" },
          "suggestions": { "type": "array", "items": { "type": "string" } },
          "rationale": { "type": "string" },
          "expectedImprovement": { "type": "string" }
        },
        "required": ["adId", "adName", "currentPerformance", "iterationType", "suggestions", "rationale", "expectedImprovement"]
      }
    }
  },
  "required": ["summary", "executiveSummary", "topPerformers", "worstPerformers", "lowPerformers", 
              "whatWorks", "whatDoesntWork", "creativePatterns", "recommendations", 
              "netNewConcepts", "iterationSuggestions"]
}'::jsonb
WHERE strategist_response_schema IS NULL;

-- Update column defaults for new records
ALTER TABLE onesheet_ai_instructions
ALTER COLUMN strategist_prompt_template SET DEFAULT 'Analyze the following {{totalAds}} Facebook ads and provide comprehensive strategic insights.

Benchmarks for good performance:
- ROAS: {{benchmarkRoas}} or higher
- Hook Rate: {{benchmarkHookRate}}% or higher
- Hold Rate: {{benchmarkHoldRate}}% or higher
- Minimum Spend for Significance: ${{benchmarkSpend}}

Low Performer Criteria:
- Minimum Spend: ${{lowPerformerMinSpend}}
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

10. ITERATION SUGGESTIONS: Provide {{iterationCount}} specific iteration suggestions for existing ads, categorized by type:
    - Early Iterations: New hooks (audio/visual) for low attention rates
    - Script Iterations: USP testing, length variations for hold rate improvement
    - Fine Tuning: Replicate winners with different creators
    - Late Iterations: New angles, formats, or transformations

Focus on actionable insights that can immediately improve performance.'; 