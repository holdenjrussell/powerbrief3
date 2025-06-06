-- Fix RLS policies for UGC AI coordinator tables to support shared brand access
-- This ensures users with shared brand access can use the AI coordinator

-- Update ugc_ai_coordinator RLS policies
DROP POLICY IF EXISTS "Users can view AI coordinator for their brands" ON public.ugc_ai_coordinator;
DROP POLICY IF EXISTS "Users can manage AI coordinator for their brands" ON public.ugc_ai_coordinator;

-- SELECT: Users can view coordinators for brands they have access to
CREATE POLICY "Users can view AI coordinator for accessible brands" 
    ON public.ugc_ai_coordinator FOR SELECT
    USING (
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_ai_coordinator.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- INSERT: Users can create coordinators for brands they have editor access to
CREATE POLICY "Users can create AI coordinator for accessible brands" 
    ON public.ugc_ai_coordinator FOR INSERT
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- UPDATE: Users can update coordinators for brands they have editor access to
CREATE POLICY "Users can update AI coordinator for accessible brands" 
    ON public.ugc_ai_coordinator FOR UPDATE
    USING (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_ai_coordinator.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    )
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_ai_coordinator.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- DELETE: Only brand owners can delete coordinators
CREATE POLICY "Users can delete AI coordinator for owned brands" 
    ON public.ugc_ai_coordinator FOR DELETE
    USING (
        -- User owns the brand
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_ai_coordinator.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Update ugc_ai_coordinator_actions RLS policies
DROP POLICY IF EXISTS "Users can view AI coordinator actions for their brands" ON public.ugc_ai_coordinator_actions;
DROP POLICY IF EXISTS "Users can manage AI coordinator actions for their brands" ON public.ugc_ai_coordinator_actions;

-- SELECT: Users can view actions for coordinators they have access to
CREATE POLICY "Users can view AI coordinator actions for accessible brands" 
    ON public.ugc_ai_coordinator_actions FOR SELECT
    USING (
        coordinator_id IN (
            SELECT id FROM public.ugc_ai_coordinator
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_ai_coordinator.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has shared access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                    )
                )
            )
        )
    );

-- INSERT: Users can create actions for coordinators they have editor access to
CREATE POLICY "Users can create AI coordinator actions for accessible brands" 
    ON public.ugc_ai_coordinator_actions FOR INSERT
    WITH CHECK (
        coordinator_id IN (
            SELECT id FROM public.ugc_ai_coordinator
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_ai_coordinator.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has editor access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    );

-- UPDATE: Users can update actions for coordinators they have access to
CREATE POLICY "Users can update AI coordinator actions for accessible brands" 
    ON public.ugc_ai_coordinator_actions FOR UPDATE
    USING (
        coordinator_id IN (
            SELECT id FROM public.ugc_ai_coordinator
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_ai_coordinator.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has editor access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    )
    WITH CHECK (
        coordinator_id IN (
            SELECT id FROM public.ugc_ai_coordinator
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_ai_coordinator.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has editor access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    );

-- DELETE: Only brand owners can delete actions
CREATE POLICY "Users can delete AI coordinator actions for owned brands" 
    ON public.ugc_ai_coordinator_actions FOR DELETE
    USING (
        coordinator_id IN (
            SELECT id FROM public.ugc_ai_coordinator
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_ai_coordinator.brand_id
                AND brands.user_id = auth.uid()
            )
        )
    );

-- Update email templates RLS policies
DROP POLICY IF EXISTS "Users can view templates for their brands" ON public.ugc_email_templates;
DROP POLICY IF EXISTS "Users can manage templates for their brands" ON public.ugc_email_templates;

-- SELECT: Users can view templates for brands they have access to
CREATE POLICY "Users can view templates for accessible brands" 
    ON public.ugc_email_templates FOR SELECT
    USING (
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_templates.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- ALL operations: Users can manage templates for brands they have editor access to
CREATE POLICY "Users can manage templates for accessible brands" 
    ON public.ugc_email_templates FOR ALL
    USING (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_templates.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    )
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_templates.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Update email threads RLS policies
DROP POLICY IF EXISTS "Users can view email threads for their brands" ON public.ugc_email_threads;
DROP POLICY IF EXISTS "Users can manage email threads for their brands" ON public.ugc_email_threads;

-- SELECT: Users can view threads for brands they have access to
CREATE POLICY "Users can view email threads for accessible brands" 
    ON public.ugc_email_threads FOR SELECT
    USING (
        -- User has access to the brand (owner or shared)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_threads.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has shared access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                )
            )
        )
    );

-- ALL operations: Users can manage threads for brands they have editor access to
CREATE POLICY "Users can manage email threads for accessible brands" 
    ON public.ugc_email_threads FOR ALL
    USING (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_threads.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    )
    WITH CHECK (
        -- User has access to the brand (owner or editor)
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_email_threads.brand_id
            AND (
                -- User owns the brand
                brands.user_id = auth.uid()
                OR
                -- User has editor access to the brand
                EXISTS (
                    SELECT 1 FROM public.brand_shares
                    WHERE brand_shares.brand_id = brands.id
                    AND brand_shares.shared_with_user_id = auth.uid()
                    AND brand_shares.status = 'accepted'
                    AND brand_shares.role = 'editor'
                )
            )
        )
    );

-- Update email messages RLS policies
DROP POLICY IF EXISTS "Users can view email messages for their brands" ON public.ugc_email_messages;
DROP POLICY IF EXISTS "Users can manage email messages for their brands" ON public.ugc_email_messages;

-- SELECT: Users can view messages for threads they have access to
CREATE POLICY "Users can view email messages for accessible brands" 
    ON public.ugc_email_messages FOR SELECT
    USING (
        thread_id IN (
            SELECT id FROM public.ugc_email_threads 
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_email_threads.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has shared access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                    )
                )
            )
        )
    );

-- ALL operations: Users can manage messages for threads they have editor access to
CREATE POLICY "Users can manage email messages for accessible brands" 
    ON public.ugc_email_messages FOR ALL
    USING (
        thread_id IN (
            SELECT id FROM public.ugc_email_threads 
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_email_threads.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has editor access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    )
    WITH CHECK (
        thread_id IN (
            SELECT id FROM public.ugc_email_threads 
            WHERE EXISTS (
                SELECT 1 FROM public.brands
                WHERE brands.id = ugc_email_threads.brand_id
                AND (
                    -- User owns the brand
                    brands.user_id = auth.uid()
                    OR
                    -- User has editor access to the brand
                    EXISTS (
                        SELECT 1 FROM public.brand_shares
                        WHERE brand_shares.brand_id = brands.id
                        AND brand_shares.shared_with_user_id = auth.uid()
                        AND brand_shares.status = 'accepted'
                        AND brand_shares.role = 'editor'
                    )
                )
            )
        )
    ); 