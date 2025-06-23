-- Migration: Add AI instructions and new analysis fields
-- Created: 2025-01-31

-- Add new analysis fields to ad audit data structure
-- These will be stored in the JSONB ad_account_audit column

-- Add AI instructions table for storing customizable AI analysis settings
CREATE TABLE IF NOT EXISTS onesheet_ai_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onesheet_id UUID NOT NULL REFERENCES onesheet(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  
  -- Content Variables Configuration
  content_variables JSONB DEFAULT '[]'::jsonb,
  content_variables_return_multiple BOOLEAN DEFAULT false,
  content_variables_selection_guidance TEXT DEFAULT 'When multiple variables are present, prioritize the most prominent or impactful element in the ad.',
  content_variables_allow_new BOOLEAN DEFAULT true,
  
  -- Awareness Levels Configuration  
  awareness_levels JSONB DEFAULT '[
    {"name": "Unaware", "description": "Audience doesn''t know they have a problem"},
    {"name": "Problem Aware", "description": "Knows they have a problem but not aware of solutions"},
    {"name": "Solution Aware", "description": "Knows solutions exist but not aware of your specific product"},
    {"name": "Product Aware", "description": "Knows your product but hasn''t decided to purchase"},
    {"name": "Most Aware", "description": "Ready to buy, just needs the right offer"}
  ]'::jsonb,
  awareness_levels_allow_new BOOLEAN DEFAULT true,
  
  -- AI Learning - discovered variables/levels that AI has found
  discovered_content_variables JSONB DEFAULT '[]'::jsonb,
  discovered_awareness_levels JSONB DEFAULT '[]'::jsonb,
  
  -- AI Prompts - customizable prompts for analysis
  main_analysis_prompt TEXT,
  content_variables_prompt TEXT,
  awareness_levels_prompt TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one instruction set per onesheet
  UNIQUE(onesheet_id)
);

-- Add RLS policies
ALTER TABLE onesheet_ai_instructions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access AI instructions for their own brands
CREATE POLICY "Users can manage AI instructions for their brands" ON onesheet_ai_instructions
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM brands 
      WHERE user_id = auth.uid()
      OR id IN (
        SELECT brand_id FROM brand_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND status = 'accepted'
      )
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_onesheet_ai_instructions_onesheet_id ON onesheet_ai_instructions(onesheet_id);
CREATE INDEX IF NOT EXISTS idx_onesheet_ai_instructions_brand_id ON onesheet_ai_instructions(brand_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_onesheet_ai_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onesheet_ai_instructions_updated_at
  BEFORE UPDATE ON onesheet_ai_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_onesheet_ai_instructions_updated_at();

-- Initialize default AI instructions for existing onesheets
INSERT INTO onesheet_ai_instructions (onesheet_id, brand_id, content_variables)
SELECT 
  o.id as onesheet_id,
  o.brand_id,
  '[
    {"name": "Podcast", "description": "Usually in a podcast studio. May or may not have multiple speakers - has big mics, etc."},
    {"name": "Man on the Street", "description": "Features a person interviewing someone on the street"},
    {"name": "Testimonial", "description": "Customer or user sharing their experience with the product"},
    {"name": "Product Demo", "description": "Showing the product in use or demonstrating features"},
    {"name": "Seductive Visuals", "description": "Visually appealing or attractive imagery designed to capture attention"},
    {"name": "Product Shots", "description": "Clean, professional shots of the product itself"},
    {"name": "Scientific Research", "description": "References to studies, data, or scientific backing"},
    {"name": "AI Voiceover", "description": "Computer-generated voice narration"}
  ]'::jsonb
FROM onesheet o
WHERE NOT EXISTS (
  SELECT 1 FROM onesheet_ai_instructions ai 
  WHERE ai.onesheet_id = o.id
);

-- Add comment
COMMENT ON TABLE onesheet_ai_instructions IS 'Stores customizable AI analysis instructions and discovered variables/levels for each OneSheet'; 