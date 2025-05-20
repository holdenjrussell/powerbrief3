-- Drop existing policies
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_0" ON "storage"."objects";
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_1" ON "storage"."objects";
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_2" ON "storage"."objects";
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_3" ON "storage"."objects";

-- Create new policies for authenticated users
CREATE POLICY "Allow authenticated users to delete their own files"
ON "storage"."objects"
AS PERMISSIVE
FOR DELETE
TO authenticated
USING ((bucket_id = 'files'::text) AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text)));

CREATE POLICY "Allow authenticated users to update their own files"
ON "storage"."objects"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING ((bucket_id = 'files'::text) AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text)));

CREATE POLICY "Allow authenticated users to insert their own files"
ON "storage"."objects"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK ((bucket_id = 'files'::text) AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text)));

CREATE POLICY "Allow authenticated users to select their own files"
ON "storage"."objects"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING ((bucket_id = 'files'::text) AND (name ~ (('^'::text || (auth.uid())::text) || '/'::text))); 