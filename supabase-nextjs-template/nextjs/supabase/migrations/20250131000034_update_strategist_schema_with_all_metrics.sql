-- Update strategist response schema to include all metrics
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
          "hookRate": { "type": ["number", "null"] },
          "holdRate": { "type": ["number", "null"] },
          "type": { "type": ["string", "null"] },
          "adDuration": { "type": ["number", "string", "null"] },
          "productIntro": { "type": ["number", "string", "null"] },
          "sitInProblemSeconds": { "type": ["number", "null"] },
          "sitInProblem": { "type": ["string", "null"] },
          "creatorsUsed": { "type": ["number", "null"] },
          "angle": { "type": ["string", "null"] },
          "format": { "type": ["string", "null"] },
          "emotion": { "type": ["string", "null"] },
          "framework": { "type": ["string", "null"] },
          "contentVariables": { "type": ["string", "null"] },
          "thumbnailUrl": { "type": ["string", "null"] },
          "imageUrl": { "type": ["string", "null"] },
          "videoId": { "type": ["string", "null"] },
          "assetUrl": { "type": ["string", "null"] },
          "assetType": { "type": ["string", "null"] },
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
          "hookRate": { "type": ["number", "null"] },
          "holdRate": { "type": ["number", "null"] },
          "type": { "type": ["string", "null"] },
          "adDuration": { "type": ["number", "string", "null"] },
          "productIntro": { "type": ["number", "string", "null"] },
          "sitInProblemSeconds": { "type": ["number", "null"] },
          "sitInProblem": { "type": ["string", "null"] },
          "creatorsUsed": { "type": ["number", "null"] },
          "angle": { "type": ["string", "null"] },
          "format": { "type": ["string", "null"] },
          "emotion": { "type": ["string", "null"] },
          "framework": { "type": ["string", "null"] },
          "contentVariables": { "type": ["string", "null"] },
          "thumbnailUrl": { "type": ["string", "null"] },
          "imageUrl": { "type": ["string", "null"] },
          "videoId": { "type": ["string", "null"] },
          "assetUrl": { "type": ["string", "null"] },
          "assetType": { "type": ["string", "null"] },
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
          "hookRate": { "type": ["number", "null"] },
          "holdRate": { "type": ["number", "null"] },
          "type": { "type": ["string", "null"] },
          "adDuration": { "type": ["number", "string", "null"] },
          "productIntro": { "type": ["number", "string", "null"] },
          "sitInProblemSeconds": { "type": ["number", "null"] },
          "sitInProblem": { "type": ["string", "null"] },
          "creatorsUsed": { "type": ["number", "null"] },
          "angle": { "type": ["string", "null"] },
          "format": { "type": ["string", "null"] },
          "emotion": { "type": ["string", "null"] },
          "framework": { "type": ["string", "null"] },
          "contentVariables": { "type": ["string", "null"] },
          "thumbnailUrl": { "type": ["string", "null"] },
          "imageUrl": { "type": ["string", "null"] },
          "videoId": { "type": ["string", "null"] },
          "assetUrl": { "type": ["string", "null"] },
          "assetType": { "type": ["string", "null"] },
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
}'::jsonb; 