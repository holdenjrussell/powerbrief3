-- Enable RLS for contracts, contract_recipients, and contract_fields if not already enabled
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing generic policies first (if they exist and are too permissive or conflict)
-- It's safer to drop and recreate to ensure the desired state.
-- Example: DROP POLICY IF EXISTS "Enable read access for all users" ON public.contracts;
-- For this draft, I'll assume we are defining fresh or replacing policies with specific names.

----------------------------------
-- Policies for 'contracts' table
----------------------------------

-- Authenticated users: Can manage (CRUD) their own contracts
CREATE POLICY "Contracts: Authenticated users can manage their own" 
ON public.contracts FOR ALL
USING (auth.role() = 'authenticated' AND auth.uid() = user_id)
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Anon users: Can read a contract if a valid signing token for that contract exists
-- This allows the /api/contracts/sign/verify-token to potentially fetch contract details if needed,
-- though it typically uses service_role. This RLS is more for direct client access if ever enabled.
CREATE POLICY "Contracts: Anon can read with valid token" 
ON public.contracts FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.contract_signing_tokens t
    WHERE t.contract_id = id AND t.expires_at > NOW() AND t.used_at IS NULL
  )
);

-------------------------------------------
-- Policies for 'contract_recipients' table
-------------------------------------------

-- Authenticated users: Can manage recipients of their own contracts
CREATE POLICY "Recipients: Authenticated users can manage for their contracts" 
ON public.contract_recipients FOR ALL
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
);

-- Anon users: Can read their own recipient record if they have a valid token for it
CREATE POLICY "Recipients: Anon can read their own with valid token"
ON public.contract_recipients FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.contract_signing_tokens t
    WHERE t.contract_id = contract_recipients.contract_id 
      AND t.recipient_id = contract_recipients.id::TEXT
      AND t.expires_at > NOW() 
      AND t.used_at IS NULL
  )
);

---------------------------------------
-- Policies for 'contract_fields' table
---------------------------------------

-- Authenticated users: Can manage fields of their own contracts
CREATE POLICY "Fields: Authenticated users can manage for their contracts" 
ON public.contract_fields FOR ALL
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
);

-- Anon users: Can read fields assigned to them on a contract if they have a valid token
CREATE POLICY "Fields: Anon can read assigned fields with valid token"
ON public.contract_fields FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.contract_signing_tokens t
    WHERE t.contract_id = contract_fields.contract_id 
      AND t.recipient_id = contract_fields.recipient_id::TEXT
      AND t.expires_at > NOW() 
      AND t.used_at IS NULL
  )
);

-- Anon users: Can UPDATE the 'value' of fields assigned to them if they have a valid token
-- This is the "editable" part for the public signer.
-- Restrict to only updating the 'value' column for safety.
CREATE POLICY "Fields: Anon can update value of assigned fields with valid token"
ON public.contract_fields FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.contract_signing_tokens t
    WHERE t.contract_id = contract_fields.contract_id 
      AND t.recipient_id = contract_fields.recipient_id::TEXT
      AND t.expires_at > NOW() 
      AND t.used_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.contract_signing_tokens t
    WHERE t.contract_id = contract_fields.contract_id 
      AND t.recipient_id = contract_fields.recipient_id::TEXT
      AND t.expires_at > NOW() 
      AND t.used_at IS NULL
  )
  -- Add additional checks if necessary, e.g., ensuring the field type is one that should be updated by a signer.
);

-- Note: The policy for updating fields by anon users currently allows updating any column if the row is accessible.
-- To strictly limit updates to only the 'value' column via RLS, it's more complex.
-- PostgreSQL RLS 'WITH CHECK' applies to rows, not specific columns for UPDATE.
-- Column-level permissions are typically handled via GRANT/REVOKE, but RLS provides row-level access control.
-- The most secure way to handle this is to ensure the API endpoint that processes field updates *only* accepts changes to the 'value' field.
-- The RLS policy above ensures *which rows* can be updated by a public user with a token.

---------------------------------------------------
-- Policies for 'contract_signing_tokens' table (Review and Augment)
---------------------------------------------------
-- The existing "Public can verify valid tokens" for SELECT is good for read-only verification.
-- We might need to ensure authenticated users (contract owners) can manage/view tokens for their own contracts if needed for admin purposes.

-- Example: Authenticated users can view tokens related to their contracts
CREATE POLICY "Tokens: Authenticated users can view for their contracts" 
ON public.contract_signing_tokens FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
);

-- The API using service_role will bypass RLS for creating tokens and marking them used.
-- If you needed an RLS policy for an authenticated user to, for example, invalidate a token (set used_at),
-- that would be an UPDATE policy for authenticated users on their contract's tokens.


-- Reminder: Always test RLS policies thoroughly in a staging environment.
-- Incorrect RLS can lead to data exposure or unintended access restrictions.
