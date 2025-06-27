-- Fix invalid JSON syntax in create_default_scorecard_metrics function
-- The calculation_formula field expects JSONB but was receiving plain strings

CREATE OR REPLACE FUNCTION public.create_default_scorecard_metrics(p_brand_id uuid, p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the brand owner's user_id
  SELECT user_id INTO v_user_id FROM brands WHERE id = p_brand_id;
  
  -- If no user_id found, skip creation
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Meta account ROAS
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id, 
    p_team_id,
    v_user_id,
    'meta_account_roas',
    'Meta Account ROAS',
    'Return on Ad Spend across all Meta campaigns',
    'standard',
    '[{"type":"metric","value":"purchase_value"},{"type":"operator","value":"/"},{"type":"metric","value":"spend"}]'::jsonb,
    ARRAY['purchase_roas', 'spend'],
    false,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Meta account spend
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'meta_account_spend',
    'Meta Account Spend',
    'Total ad spend across all Meta campaigns',
    'standard',
    ARRAY['spend'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Meta account revenue
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'meta_account_revenue',
    'Meta Account Revenue',
    'Total revenue from Meta campaigns',
    'standard',
    '[{"type":"metric","value":"action_values.omni_purchase"}]'::jsonb,
    ARRAY['action_values'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Click through rate
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'click_through_rate',
    'Click Through Rate (Link)',
    'Percentage of impressions that resulted in link clicks',
    'standard',
    '[{"type":"metric","value":"link_clicks"},{"type":"operator","value":"/"},{"type":"metric","value":"impressions"},{"type":"operator","value":"*"},{"type":"number","value":100}]'::jsonb,
    ARRAY['link_clicks', 'impressions'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Click to purchase rate
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_percentage, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'click_to_purchase_rate',
    'Click to Purchase Rate',
    'Percentage of link clicks that resulted in purchases',
    'standard',
    '[{"type":"metric","value":"actions.omni_purchase"},{"type":"operator","value":"/"},{"type":"metric","value":"link_clicks"},{"type":"operator","value":"*"},{"type":"number","value":100}]'::jsonb,
    ARRAY['actions', 'link_clicks'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Cost per unique link click
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, calculation_formula, meta_fields, is_currency, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'cost_per_unique_link_click',
    'Cost per Unique Link Click',
    'Average cost for each unique link click',
    'standard',
    '[{"type":"metric","value":"spend"},{"type":"operator","value":"/"},{"type":"metric","value":"unique_link_clicks"}]'::jsonb,
    ARRAY['spend', 'unique_link_clicks'],
    true,
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Creative testing metrics (initially without campaigns selected)
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'creative_testing_roas',
    'Creative Testing ROAS',
    'ROAS for selected creative testing campaigns',
    'creative_testing',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, is_currency)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'creative_testing_spend',
    'Creative Testing Spend',
    'Spend for selected creative testing campaigns',
    'creative_testing',
    ARRAY['spend'],
    true
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, is_currency)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'creative_testing_revenue',
    'Creative Testing Revenue',
    'Revenue from selected creative testing campaigns',
    'creative_testing',
    ARRAY['action_values'],
    true
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  -- Video/Image ads metrics (placeholders - need to determine calculation method)
  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'video_ads_roas',
    'Video Ads ROAS',
    'ROAS for video ad formats',
    'custom',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;

  INSERT INTO scorecard_metrics (brand_id, team_id, user_id, metric_key, display_name, description, metric_type, meta_fields, decimal_places)
  VALUES (
    p_brand_id,
    p_team_id,
    v_user_id,
    'image_ads_roas',
    'Image Ads ROAS',
    'ROAS for image ad formats',
    'custom',
    ARRAY['purchase_roas', 'spend'],
    2
  ) ON CONFLICT (brand_id, team_id, metric_key) DO NOTHING;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_scorecard_metrics(uuid, uuid) TO authenticated; 