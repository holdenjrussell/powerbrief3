-- Fix brief_batches UPDATE RLS policy to allow brand owners to update batches in their brand
DROP POLICY IF EXISTS "Users can update accessible brief batches" ON brief_batches;

CREATE POLICY "Users can update accessible brief batches" ON brief_batches
    FOR UPDATE USING (
        -- User created the batch
        auth.uid() = user_id 
        OR 
        -- User owns the brand
        EXISTS (
            SELECT 1 
            FROM brands b 
            WHERE b.id = brief_batches.brand_id 
            AND b.user_id = auth.uid()
        )
        OR 
        -- User has editor access through brand sharing
        EXISTS (
            SELECT 1
            FROM brands b
            JOIN brand_shares bs ON bs.brand_id = b.id
            WHERE b.id = brief_batches.brand_id 
            AND bs.shared_with_user_id = auth.uid() 
            AND bs.status = 'accepted' 
            AND bs.role = 'editor'
        )
    ); 