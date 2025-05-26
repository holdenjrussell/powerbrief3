-- Add naming convention settings to brands table
-- This migration adds fields for customizable naming conventions used in bulk AI rename

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS naming_convention_settings JSONB DEFAULT '{
  "prefixes": [
    {
      "id": "ld-001",
      "prefix": "ld(",
      "meaning": "Launch Date",
      "type": "dynamic",
      "abbreviations": [],
      "order": 0
    },
    {
      "id": "pt-001", 
      "prefix": "pt(",
      "meaning": "Primary Theme",
      "type": "dynamic",
      "abbreviations": [],
      "order": 1
    },
    {
      "id": "wc-001",
      "prefix": "wc(",
      "meaning": "Wildcard",
      "type": "wildcard",
      "abbreviations": [],
      "order": 2
    },
    {
      "id": "ang-001",
      "prefix": "ang(",
      "meaning": "Angle",
      "type": "abbreviation",
      "abbreviations": [
        {
          "key": "DESR",
          "full_name": "Desire & Attraction",
          "description": "Content focused on creating desire and attraction for the product"
        },
        {
          "key": "PAIN",
          "full_name": "Pain Point",
          "description": "Content addressing customer pain points and problems"
        },
        {
          "key": "BENE",
          "full_name": "Benefits Focus",
          "description": "Content highlighting product benefits and advantages"
        }
      ],
      "order": 3
    },
    {
      "id": "strat-001",
      "prefix": "strat(",
      "meaning": "Strategist",
      "type": "dynamic",
      "abbreviations": [],
      "order": 4
    }
  ],
  "separator": ")_",
  "include_editor": true,
  "include_strategist": true,
  "include_launch_date": true,
  "date_format": "MM-DD-YYYY",
  "custom_prompt_template": ""
}'::jsonb;

-- Create an index for faster lookups on naming convention settings
CREATE INDEX IF NOT EXISTS brands_naming_convention_settings_idx 
ON public.brands USING GIN (naming_convention_settings);

-- Add comment to explain the purpose of this field
COMMENT ON COLUMN public.brands.naming_convention_settings IS 'JSONB field storing customizable naming convention settings for bulk AI rename feature including prefixes, separators, abbreviations, and metadata inclusion preferences'; 