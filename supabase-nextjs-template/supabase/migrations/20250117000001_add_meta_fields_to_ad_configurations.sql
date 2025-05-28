-- Migration to ensure ad configurations can store Meta account settings
-- This migration doesn't change the table structure since settings is already JSONB,
-- but documents the expected structure for Meta account settings in configurations

-- Add comments to document the expected structure of settings JSONB field
COMMENT ON COLUMN public.ad_configurations.settings IS 'Configuration settings including Meta accounts: {
  "campaignId": "string|null",
  "campaignName": "string|null", 
  "adSetId": "string|null",
  "adSetName": "string|null",
  "adAccountId": "string|null",
  "adAccountName": "string|null",
  "fbPage": "string",
  "fbPageName": "string|null",
  "igAccount": "string", 
  "igAccountName": "string|null",
  "pixel": "string",
  "pixelName": "string|null",
  "urlParams": "string",
  "status": "ACTIVE|PAUSED",
  "primaryText": "string",
  "headline": "string", 
  "description": "string",
  "destinationUrl": "string",
  "callToAction": "string",
  "siteLinks": "array",
  "advantageCreative": "object"
}';

-- This migration ensures that the ad configurations table can store:
-- 1. Meta account IDs and their corresponding names/labels
-- 2. All brand settings from Meta integration
-- 3. Manual entry labels for display purposes
-- 4. Both API-fetched names and user-defined labels

-- The settings JSONB field will now include:
-- - adAccountId + adAccountName (for display)
-- - fbPage + fbPageName (for display) 
-- - igAccount + igAccountName (for display)
-- - pixel + pixelName (for display)
-- - All existing configuration fields

-- Example settings structure:
-- {
--   "adAccountId": "123456789",
--   "adAccountName": "Main Ad Account", 
--   "fbPage": "987654321",
--   "fbPageName": "Brand Page",
--   "igAccount": "555666777", 
--   "igAccountName": "Brand Instagram",
--   "pixel": "111222333",
--   "pixelName": "Main Pixel",
--   "campaignId": "campaign_123",
--   "campaignName": "Holiday Campaign",
--   "adSetId": "adset_456", 
--   "adSetName": "Lookalike Audience",
--   "urlParams": "utm_source=facebook",
--   "status": "PAUSED",
--   "primaryText": "Check out our latest offer!",
--   "headline": "Amazing New Product",
--   "description": "",
--   "destinationUrl": "https://example.com",
--   "callToAction": "LEARN_MORE",
--   "siteLinks": [],
--   "advantageCreative": {...}
-- } 