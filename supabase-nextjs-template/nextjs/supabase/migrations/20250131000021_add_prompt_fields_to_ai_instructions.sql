-- Migration: Add individual prompt fields to AI instructions table
-- Created: 2025-01-31
-- Purpose: Add specific prompt fields for each analysis category to support the protected prompt structure

-- Add new prompt columns for each analysis field type
ALTER TABLE onesheet_ai_instructions 
ADD COLUMN IF NOT EXISTS type_prompt TEXT,
ADD COLUMN IF NOT EXISTS angle_prompt TEXT,
ADD COLUMN IF NOT EXISTS format_prompt TEXT,
ADD COLUMN IF NOT EXISTS emotion_prompt TEXT,
ADD COLUMN IF NOT EXISTS framework_prompt TEXT,
ADD COLUMN IF NOT EXISTS transcription_prompt TEXT,
ADD COLUMN IF NOT EXISTS visual_description_prompt TEXT; 