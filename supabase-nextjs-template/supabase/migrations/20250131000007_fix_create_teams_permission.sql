-- Fix permission denied error for create_default_teams_for_brand function
-- This function is called by a trigger when a new brand is created
-- It needs SECURITY DEFINER to run with elevated permissions

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_default_teams_for_brand(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_creative_team_id UUID;
  v_marketing_team_id UUID;
  v_cro_team_id UUID;
BEGIN
  -- Create default teams
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'Creative Team', true)
  RETURNING id INTO v_creative_team_id;
  
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'Marketing Team', false)
  RETURNING id INTO v_marketing_team_id;
  
  INSERT INTO teams (brand_id, name, is_default) 
  VALUES (p_brand_id, 'CRO', false)
  RETURNING id INTO v_cro_team_id;
  
  -- Set default feature access for all teams
  WITH features AS (
    SELECT unnest(ARRAY[
      'powerbrief_onesheet',
      'powerbrief_ads',
      'powerbrief_web_assets',
      'powerbrief_email',
      'powerbrief_sms',
      'powerbrief_organic_social',
      'powerbrief_blog',
      'powerframe',
      'ugc_creator_pipeline',
      'team_sync',
      'asset_reviews',
      'ad_ripper',
      'ad_upload_tool',
      'url_to_markdown'
    ]) AS feature_key
  )
  INSERT INTO team_feature_access (team_id, feature_key, has_access)
  SELECT t.id, f.feature_key, true
  FROM teams t
  CROSS JOIN features f
  WHERE t.brand_id = p_brand_id;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_teams_for_brand(uuid) TO authenticated;

-- Also update the trigger function to have SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_brand_teams()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM create_default_teams_for_brand(NEW.id);
  RETURN NEW;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_brand_teams() TO authenticated; 