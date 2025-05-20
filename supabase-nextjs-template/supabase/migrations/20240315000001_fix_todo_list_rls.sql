-- Drop the existing policy first
DROP POLICY IF EXISTS "Owner can do everything" ON "public"."todo_list";

-- Create a simpler policy for all operations
CREATE POLICY "Enable all operations for authenticated users on their own rows"
ON "public"."todo_list"
FOR ALL
TO authenticated
USING (owner = auth.uid())
WITH CHECK (owner = auth.uid());

-- Reset permissions to ensure they're correct
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."todo_list" TO authenticated; 