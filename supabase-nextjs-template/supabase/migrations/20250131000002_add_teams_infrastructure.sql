-- Add teams infrastructure for multi-team support

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(brand_id, name)
);

-- Create team members junction table
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

-- Create team feature access table
CREATE TABLE IF NOT EXISTS team_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  has_access BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, feature_key)
);

-- Update brand_shares table
ALTER TABLE brand_shares 
ADD COLUMN IF NOT EXISTS team_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update team_sync tables
ALTER TABLE team_sync_announcements
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS target_team_ids UUID[] DEFAULT '{}';

ALTER TABLE team_sync_todos
ADD COLUMN IF NOT EXISTS target_team_id UUID REFERENCES teams(id);

ALTER TABLE team_sync_issues
ADD COLUMN IF NOT EXISTS target_team_id UUID REFERENCES teams(id);

-- Create RLS policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_feature_access ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Brand owners can manage teams"
  ON teams FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));

-- Team members policies
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.brand_id IN (
        SELECT brand_id FROM brands WHERE user_id = auth.uid()
        UNION
        SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Brand owners can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN brands b ON t.brand_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Team feature access policies
CREATE POLICY "Users can view feature access"
  ON team_feature_access FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.brand_id IN (
        SELECT brand_id FROM brands WHERE user_id = auth.uid()
        UNION
        SELECT brand_id FROM brand_shares WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Brand owners can manage feature access"
  ON team_feature_access FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN brands b ON t.brand_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- Create function to initialize default teams for a brand
CREATE OR REPLACE FUNCTION create_default_teams_for_brand(p_brand_id UUID)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default teams when a brand is created
CREATE OR REPLACE FUNCTION handle_new_brand_teams()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_teams_for_brand(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_brand_created_create_teams
  AFTER INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_brand_teams();

-- Initialize default teams for existing brands
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM brands LOOP
    PERFORM create_default_teams_for_brand(r.id);
  END LOOP;
END $$;

-- Add all existing brand share users to the Creative Team
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, bs.shared_with_user_id
FROM brand_shares bs
JOIN teams t ON t.brand_id = bs.brand_id AND t.name = 'Creative Team' AND t.is_default = true
WHERE bs.status = 'accepted'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Also add brand owners to their Creative Team
INSERT INTO team_members (team_id, user_id)
SELECT DISTINCT t.id, b.user_id
FROM brands b
JOIN teams t ON t.brand_id = b.id AND t.name = 'Creative Team' AND t.is_default = true
ON CONFLICT (team_id, user_id) DO NOTHING;