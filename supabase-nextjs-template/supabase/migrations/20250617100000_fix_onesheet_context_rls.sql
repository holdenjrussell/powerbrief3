-- Fix OneSheet Context Data RLS Policy to Include Brand Sharing

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Users can manage their own OneSheet context data" ON onesheet_context_data;

-- Create comprehensive policies that support both owned and shared brands
CREATE POLICY "Users can view context data for owned brands" ON onesheet_context_data
FOR SELECT USING (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        WHERE b.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view context data for shared brands" ON onesheet_context_data
FOR SELECT USING (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        JOIN brand_shares bs ON b.id = bs.brand_id
        WHERE bs.shared_with_user_id = auth.uid() 
        AND bs.status = 'accepted'
    )
);

CREATE POLICY "Users can create context data for owned brands" ON onesheet_context_data
FOR INSERT WITH CHECK (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        WHERE b.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create context data for shared brands" ON onesheet_context_data
FOR INSERT WITH CHECK (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        JOIN brand_shares bs ON b.id = bs.brand_id
        WHERE bs.shared_with_user_id = auth.uid() 
        AND bs.status = 'accepted'
    )
);

CREATE POLICY "Users can update context data for owned brands" ON onesheet_context_data
FOR UPDATE USING (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        WHERE b.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update context data for shared brands" ON onesheet_context_data
FOR UPDATE USING (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        JOIN brand_shares bs ON b.id = bs.brand_id
        WHERE bs.shared_with_user_id = auth.uid() 
        AND bs.status = 'accepted'
    )
);

CREATE POLICY "Users can delete context data for owned brands" ON onesheet_context_data
FOR DELETE USING (
    onesheet_id IN (
        SELECT o.id FROM onesheet o
        JOIN brands b ON o.brand_id = b.id
        WHERE b.user_id = auth.uid()
    )
);

-- Add comment
COMMENT ON TABLE onesheet_context_data IS 'Stores context data for OneSheets with proper RLS for owned and shared brands'; 