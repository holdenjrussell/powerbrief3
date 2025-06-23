-- Apply OneSheet Stages Completion Fix
-- This migration fixes OneSheets that have completed ad audits but don't show as complete

-- Fix OneSheets that have ad_account_audit data but missing stages_completed.ad_audit flag
UPDATE onesheet 
SET stages_completed = COALESCE(stages_completed, '{}'::jsonb) || '{"ad_audit": true}'::jsonb
WHERE ad_account_audit IS NOT NULL 
  AND ad_account_audit::jsonb ? 'ads' 
  AND jsonb_array_length(ad_account_audit::jsonb -> 'ads') > 0
  AND (stages_completed IS NULL OR NOT (stages_completed::jsonb ? 'ad_audit') OR stages_completed::jsonb ->> 'ad_audit' = 'false');

-- Also set current_stage appropriately if it's still on ad_audit and should advance
UPDATE onesheet 
SET current_stage = 'creative_brainstorm'
WHERE ad_account_audit IS NOT NULL 
  AND ad_account_audit::jsonb ? 'ads' 
  AND jsonb_array_length(ad_account_audit::jsonb -> 'ads') > 0
  AND current_stage = 'ad_audit'
  AND (stages_completed::jsonb ? 'ad_audit' AND stages_completed::jsonb ->> 'ad_audit' = 'true'); 