-- Add max_spend to low_performer_criteria default value
UPDATE onesheet_ai_instructions
SET low_performer_criteria = jsonb_set(
  COALESCE(low_performer_criteria, '{"min_spend": 50, "max_roas": 1.0, "enabled": true}'::jsonb),
  '{max_spend}',
  '500'::jsonb
);

-- Update strategist prompt template to include max spend and sorting guidance
UPDATE onesheet_ai_instructions
SET strategist_prompt_template = REPLACE(
  REPLACE(
    strategist_prompt_template,
    'Low Performer Criteria (ads that fall flat and don''t scale):
- Minimum Spend: ${{lowPerformerMinSpend}}
- Maximum Spend: ${{lowPerformerMaxSpend}}
- Maximum ROAS: {{lowPerformerMaxRoas}}',
    'Low Performer Criteria (ads that fall flat and don''t scale):
- Minimum Spend: ${{lowPerformerMinSpend}}
- Maximum Spend: ${{lowPerformerMaxSpend}}
- Maximum ROAS: {{lowPerformerMaxRoas}}'
  ),
  '4. LOW PERFORMERS: Identify ads meeting the low performer criteria (>${{lowPerformerMinSpend}} spend, <{{lowPerformerMaxRoas}} ROAS)',
  '4. LOW PERFORMERS: Identify ads that fall flat and don''t scale (${{{lowPerformerMinSpend}}} - ${{{lowPerformerMaxSpend}}} spend, <{{lowPerformerMaxRoas}} ROAS). Sort by lowest spend first to prioritize ads that truly failed to launch.'
);

-- Update the default value for new records
ALTER TABLE onesheet_ai_instructions
ALTER COLUMN low_performer_criteria SET DEFAULT '{"min_spend": 50, "max_spend": 500, "max_roas": 1.0, "enabled": true}'::jsonb; 