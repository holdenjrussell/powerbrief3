-- Add creative brainstorm AI instructions columns to onesheet_ai_instructions table
ALTER TABLE onesheet_ai_instructions
ADD COLUMN IF NOT EXISTS creative_brainstorm_system_instructions TEXT DEFAULT 'You are an expert creative strategist specializing in Facebook and Instagram ad creation. You have deep knowledge of what makes ads successful, including hooks, angles, visual storytelling, and psychological triggers. Your goal is to generate high-converting creative concepts based on comprehensive market research and performance data.',
ADD COLUMN IF NOT EXISTS creative_brainstorm_prompt_template TEXT DEFAULT 'Based on the comprehensive research data provided, generate creative concepts, hooks, and visual ideas for Facebook/Instagram ads.

CONTEXT DATA:
{{contextData}}

ANALYSIS REQUIREMENTS:

1. NET NEW CONCEPTS (5-7 concepts):
   - Each concept should have a unique angle from the audience research
   - Target specific personas identified in the research
   - Include the primary emotion and framework to use
   - Specify the awareness level this concept targets

2. ITERATIONS:
   - For selected high-performing ads
   - Specific changes to test
   - Categorized by iteration type (early, script, fine-tuning, late)

3. HOOKS (Both Visual and Audio):
   - Use actual customer language from reviews and forums
   - Include both visual and audio hook variations
   - Make them scroll-stopping and curiosity-inducing
   - Specify whether it''s a visual or audio hook

4. VISUALS:
   - Based on top-performing formats from ad audit
   - Include specific scene descriptions
   - Mention color schemes and visual elements
   - Specify if it''s for video, static, or carousel

5. CREATIVE BEST PRACTICES:
   - Key learnings from the ad audit
   - Do''s and don''ts based on performance data
   - Specific recommendations for this brand/product

OUTPUT FORMAT:
Return a comprehensive JSON object with all creative elements organized by category.',
ADD COLUMN IF NOT EXISTS creative_brainstorm_response_schema JSONB DEFAULT '{
  "type": "object",
  "properties": {
    "netNewConcepts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "angle": {"type": "string"},
          "targetPersona": {"type": "string"},
          "emotion": {"type": "string"},
          "framework": {"type": "string"},
          "awarenessLevel": {"type": "string"},
          "description": {"type": "string"}
        },
        "required": ["id", "name", "angle", "targetPersona", "emotion", "framework", "awarenessLevel", "description"]
      }
    },
    "iterations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "adId": {"type": "string"},
          "adName": {"type": "string"},
          "iterationType": {"type": "string", "enum": ["early", "script", "fine_tuning", "late"]},
          "suggestion": {"type": "string"},
          "expectedImpact": {"type": "string"}
        },
        "required": ["adId", "adName", "iterationType", "suggestion", "expectedImpact"]
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
              "id": {"type": "string"},
              "hook": {"type": "string"},
              "conceptId": {"type": "string"},
              "rationale": {"type": "string"}
            },
            "required": ["id", "hook", "rationale"]
          }
        },
        "audio": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "hook": {"type": "string"},
              "conceptId": {"type": "string"},
              "rationale": {"type": "string"}
            },
            "required": ["id", "hook", "rationale"]
          }
        }
      },
      "required": ["visual", "audio"]
    },
    "visuals": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "conceptId": {"type": "string"},
          "type": {"type": "string", "enum": ["video", "static", "carousel", "gif"]},
          "description": {"type": "string"},
          "scenes": {"type": "array", "items": {"type": "string"}},
          "colorScheme": {"type": "string"},
          "keyElements": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["id", "type", "description", "colorScheme", "keyElements"]
      }
    },
    "creativeBestPractices": {
      "type": "object",
      "properties": {
        "dos": {"type": "array", "items": {"type": "string"}},
        "donts": {"type": "array", "items": {"type": "string"}},
        "keyLearnings": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}}
      },
      "required": ["dos", "donts", "keyLearnings", "recommendations"]
    }
  },
  "required": ["netNewConcepts", "iterations", "hooks", "visuals", "creativeBestPractices"]
}'::jsonb,
ADD COLUMN IF NOT EXISTS creative_brainstorm_model TEXT DEFAULT 'gemini-2.5-flash-lite-preview-06-17',
ADD COLUMN IF NOT EXISTS creative_brainstorm_context_options JSONB DEFAULT '{
  "contextHub": {
    "websites": true,
    "reviews": true,
    "reddit": true,
    "articles": true,
    "socialContent": true
  },
  "audienceResearch": {
    "angles": true,
    "benefits": true,
    "painPoints": true,
    "features": true,
    "objections": true,
    "failedSolutions": true,
    "other": true,
    "personas": true
  },
  "competitorResearch": {
    "competitors": true,
    "strategicAnalysis": true
  },
  "adAccountAudit": {
    "fullDataTable": true,
    "selectedAds": false,
    "selectedAdIds": []
  },
  "demographics": {
    "includeVisualizations": true
  },
  "aiStrategist": {
    "analysisSummary": true,
    "strategicSummary": true,
    "recommendations": true,
    "creativePatterns": true,
    "losingElements": true,
    "bestPerformingHooks": true,
    "optimalSitInProblemRange": true,
    "topPerformingAds": true,
    "lowPerformingAds": true
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS claude_system_instructions TEXT DEFAULT 'You are an expert creative strategist specializing in Facebook and Instagram ad creation. You have deep knowledge of what makes ads successful, including hooks, angles, visual storytelling, and psychological triggers. Your goal is to generate high-converting creative concepts based on comprehensive market research and performance data.',
ADD COLUMN IF NOT EXISTS claude_prompt_template TEXT DEFAULT 'Based on the comprehensive research data provided, generate creative concepts, hooks, and visual ideas for Facebook/Instagram ads.

CONTEXT DATA:
{{contextData}}

Generate creative concepts following this exact JSON structure:

{
  "netNewConcepts": [
    {
      "id": "unique-id",
      "name": "Concept Name",
      "angle": "Primary angle from research",
      "targetPersona": "Specific persona name",
      "emotion": "Primary emotion",
      "framework": "PAS/AIDA/etc",
      "awarenessLevel": "Problem Aware/Solution Aware/etc",
      "description": "Detailed description"
    }
  ],
  "iterations": [
    {
      "adId": "ad-id",
      "adName": "Ad Name",
      "iterationType": "early/script/fine_tuning/late",
      "suggestion": "Specific iteration suggestion",
      "expectedImpact": "Expected result"
    }
  ],
  "hooks": {
    "visual": [
      {
        "id": "unique-id",
        "hook": "The actual visual hook text",
        "conceptId": "matching-concept-id",
        "rationale": "Why this hook works"
      }
    ],
    "audio": [
      {
        "id": "unique-id",
        "hook": "The actual audio hook text",
        "conceptId": "matching-concept-id",
        "rationale": "Why this hook works"
      }
    ]
  },
  "visuals": [
    {
      "id": "unique-id",
      "conceptId": "matching-concept-id",
      "type": "video/static/carousel/gif",
      "description": "Visual description",
      "scenes": ["Scene 1", "Scene 2"],
      "colorScheme": "Color description",
      "keyElements": ["Element 1", "Element 2"]
    }
  ],
  "creativeBestPractices": {
    "dos": ["Best practice 1", "Best practice 2"],
    "donts": ["Thing to avoid 1", "Thing to avoid 2"],
    "keyLearnings": ["Learning 1", "Learning 2"],
    "recommendations": ["Recommendation 1", "Recommendation 2"]
  }
}

Ensure all fields are included and follow the exact structure above.',
ADD COLUMN IF NOT EXISTS claude_model TEXT DEFAULT 'claude-3-sonnet-20240229';

-- Update the creative_brainstorm column default in onesheet table to match new structure
ALTER TABLE onesheet
ALTER COLUMN creative_brainstorm SET DEFAULT '{
  "netNewConcepts": [],
  "iterations": [],
  "hooks": {
    "visual": [],
    "audio": []
  },
  "visuals": [],
  "creativeBestPractices": {
    "dos": [],
    "donts": [],
    "keyLearnings": [],
    "recommendations": []
  }
}'::jsonb; 