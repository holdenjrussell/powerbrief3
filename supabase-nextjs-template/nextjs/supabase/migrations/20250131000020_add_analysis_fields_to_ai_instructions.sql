-- Migration: Add analysis fields to AI instructions table
-- Created: 2025-01-31
-- Purpose: Support the new safe AI prompt editor with protected analysis field definitions

-- Add new columns for analysis field definitions and settings
ALTER TABLE onesheet_ai_instructions 
ADD COLUMN IF NOT EXISTS analysis_fields JSONB DEFAULT '{
  "type": [
    {"name": "High Production Video", "description": "Professional, high-quality video production with studio lighting, multiple camera angles, or polished editing"},
    {"name": "Low Production Video (UGC)", "description": "User-generated content style with casual, authentic, smartphone-quality production"},
    {"name": "Static Image", "description": "Single image creative without motion or animation"},
    {"name": "Carousel", "description": "Multiple images or cards that users can swipe through"},
    {"name": "GIF", "description": "Animated image with looping motion"}
  ],
  "angle": [
    {"name": "Weight Management", "description": "Focus on weight loss, fat burning, or body composition changes"},
    {"name": "Time/Convenience", "description": "Emphasis on saving time, easy preparation, or convenience"},
    {"name": "Energy/Focus", "description": "Highlighting increased energy levels, mental clarity, or focus"},
    {"name": "Digestive Health", "description": "Focus on gut health, bloating reduction, or digestive comfort"},
    {"name": "Immunity Support", "description": "Emphasizing immune system support and overall health"}
  ],
  "format": [
    {"name": "Testimonial", "description": "Customer sharing their personal experience or results"},
    {"name": "Podcast Clip", "description": "Excerpt from a podcast or interview-style content"},
    {"name": "Authority Figure", "description": "Expert, doctor, or authority figure explaining benefits"},
    {"name": "3 Reasons Why", "description": "Structured list format explaining multiple benefits"},
    {"name": "Unboxing", "description": "Product reveal or unboxing experience"}
  ],
  "emotion": [
    {"name": "Hopefulness", "description": "Inspiring optimism and positive expectations for the future"},
    {"name": "Excitement", "description": "Creating enthusiasm and anticipation"},
    {"name": "Curiosity", "description": "Sparking interest and desire to learn more"},
    {"name": "Urgency", "description": "Creating time pressure or fear of missing out"},
    {"name": "Fear", "description": "Highlighting problems or negative consequences"},
    {"name": "Trust", "description": "Building credibility and reliability"}
  ],
  "framework": [
    {"name": "PAS", "description": "Problem-Agitate-Solution structure"},
    {"name": "AIDA", "description": "Attention-Interest-Desire-Action framework"},
    {"name": "FAB", "description": "Features-Advantages-Benefits approach"},
    {"name": "Star Story Solution", "description": "Hero''s journey narrative structure"},
    {"name": "Before After Bridge", "description": "Current state to desired state transformation"}
  ]
}'::jsonb;

-- Add allow new analysis values settings
ALTER TABLE onesheet_ai_instructions 
ADD COLUMN IF NOT EXISTS allow_new_analysis_values JSONB DEFAULT '{
  "type": true,
  "angle": true,
  "format": true,
  "emotion": true,
  "framework": true
}'::jsonb;

-- Add comment for the new columns
COMMENT ON COLUMN onesheet_ai_instructions.analysis_fields IS 'Stores customizable definitions for analysis fields (type, angle, format, emotion, framework) used in the protected prompt structure';
COMMENT ON COLUMN onesheet_ai_instructions.allow_new_analysis_values IS 'Boolean flags indicating whether AI can create new values for each analysis field type'; 