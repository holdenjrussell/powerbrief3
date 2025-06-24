-- Fix RLS policies for onesheet_strategist_analyses table
-- The brand_id column is TEXT but brands.id is UUID, so we need to cast properly

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view strategist analyses for their brands" ON onesheet_strategist_analyses;
DROP POLICY IF EXISTS "Users can create strategist analyses for their brands" ON onesheet_strategist_analyses;
DROP POLICY IF EXISTS "Users can update strategist analyses for their brands" ON onesheet_strategist_analyses;
DROP POLICY IF EXISTS "Users can delete strategist analyses for their brands" ON onesheet_strategist_analyses;

-- Recreate policies with proper type casting
CREATE POLICY "Users can view strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id::text = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can create strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id::text = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can update strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id::text = brand_id 
      AND (brands.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM brand_shares 
        WHERE brand_shares.brand_id = brands.id 
        AND brand_shares.shared_with_user_id = auth.uid() 
        AND brand_shares.status = 'accepted'
      ))
    )
  );

CREATE POLICY "Users can delete strategist analyses for their brands" ON onesheet_strategist_analyses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM brands 
      WHERE brands.id::text = brand_id 
      AND brands.user_id = auth.uid()
    )
  ); 