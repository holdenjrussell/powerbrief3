-- Fix UGC Workflow RLS policies to support brand sharing
-- This migration updates all UGC workflow table policies to work with shared brands

-- Drop existing policies for workflow templates
DROP POLICY IF EXISTS "Users can view their brand workflow templates" ON public.ugc_workflow_templates;
DROP POLICY IF EXISTS "Users can create workflow templates for their brands" ON public.ugc_workflow_templates;
DROP POLICY IF EXISTS "Users can update their brand workflow templates" ON public.ugc_workflow_templates;
DROP POLICY IF EXISTS "Users can delete their brand workflow templates" ON public.ugc_workflow_templates;

-- Create new policies for workflow templates with brand sharing support
CREATE POLICY "Users can view workflow templates for accessible brands" 
    ON public.ugc_workflow_templates FOR SELECT
    USING (
        -- User owns the brand
        brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
        OR
        -- User has shared access to the brand
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create workflow templates for accessible brands" 
    ON public.ugc_workflow_templates FOR INSERT
    WITH CHECK (
        -- User owns the brand
        brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
        OR
        -- User has editor access to the brand
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

CREATE POLICY "Users can update workflow templates for accessible brands" 
    ON public.ugc_workflow_templates FOR UPDATE
    USING (
        -- User owns the brand
        brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
        OR
        -- User has editor access to the brand
        brand_id IN (
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

CREATE POLICY "Users can delete workflow templates for owned brands" 
    ON public.ugc_workflow_templates FOR DELETE
    USING (
        -- Only brand owners can delete templates
        brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
    );

-- Drop existing policies for workflow steps
DROP POLICY IF EXISTS "Users can view their workflow steps" ON public.ugc_workflow_steps;

-- Create new policies for workflow steps
CREATE POLICY "Users can view workflow steps for accessible brands" 
    ON public.ugc_workflow_steps FOR SELECT
    USING (
        workflow_id IN (
            SELECT id FROM public.ugc_workflow_templates 
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage workflow steps for accessible brands" 
    ON public.ugc_workflow_steps FOR ALL
    USING (
        workflow_id IN (
            SELECT id FROM public.ugc_workflow_templates 
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    )
    WITH CHECK (
        workflow_id IN (
            SELECT id FROM public.ugc_workflow_templates 
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    );

-- Create policies for workflow conditions
CREATE POLICY "Users can manage workflow conditions for accessible brands" 
    ON public.ugc_workflow_conditions FOR ALL
    USING (
        step_id IN (
            SELECT ws.id FROM public.ugc_workflow_steps ws
            JOIN public.ugc_workflow_templates wt ON ws.workflow_id = wt.id
            WHERE wt.brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    )
    WITH CHECK (
        step_id IN (
            SELECT ws.id FROM public.ugc_workflow_steps ws
            JOIN public.ugc_workflow_templates wt ON ws.workflow_id = wt.id
            WHERE wt.brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    );

-- Create policies for workflow executions
CREATE POLICY "Users can view workflow executions for accessible brands" 
    ON public.ugc_workflow_executions FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage workflow executions for accessible brands" 
    ON public.ugc_workflow_executions FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Create policies for workflow step executions
CREATE POLICY "Users can view workflow step executions for accessible brands" 
    ON public.ugc_workflow_step_executions FOR SELECT
    USING (
        execution_id IN (
            SELECT id FROM public.ugc_workflow_executions
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage workflow step executions for accessible brands" 
    ON public.ugc_workflow_step_executions FOR ALL
    USING (
        execution_id IN (
            SELECT id FROM public.ugc_workflow_executions
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    )
    WITH CHECK (
        execution_id IN (
            SELECT id FROM public.ugc_workflow_executions
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    );

-- Create policies for custom creator statuses
CREATE POLICY "Users can view creator statuses for accessible brands" 
    ON public.ugc_custom_creator_statuses FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage creator statuses for accessible brands" 
    ON public.ugc_custom_creator_statuses FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Create policies for message templates
CREATE POLICY "Users can view message templates for accessible brands" 
    ON public.ugc_message_templates FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage message templates for accessible brands" 
    ON public.ugc_message_templates FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Create policies for human intervention queue
CREATE POLICY "Users can view human intervention queue for accessible brands" 
    ON public.ugc_human_intervention_queue FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage human intervention queue for accessible brands" 
    ON public.ugc_human_intervention_queue FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Create policies for brand job postings
CREATE POLICY "Users can view job postings for accessible brands" 
    ON public.ugc_brand_job_postings FOR SELECT
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage job postings for accessible brands" 
    ON public.ugc_brand_job_postings FOR ALL
    USING (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    )
    WITH CHECK (
        brand_id IN (
            SELECT id FROM public.brands WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM public.brand_shares 
            WHERE shared_with_user_id = auth.uid() 
            AND status = 'accepted'
            AND role = 'editor'
        )
    );

-- Create policies for job applications
CREATE POLICY "Users can view job applications for accessible brands" 
    ON public.ugc_job_applications FOR SELECT
    USING (
        job_id IN (
            SELECT id FROM public.ugc_brand_job_postings
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage job applications for accessible brands" 
    ON public.ugc_job_applications FOR ALL
    USING (
        job_id IN (
            SELECT id FROM public.ugc_brand_job_postings
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    )
    WITH CHECK (
        job_id IN (
            SELECT id FROM public.ugc_brand_job_postings
            WHERE brand_id IN (
                SELECT id FROM public.brands WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM public.brand_shares 
                WHERE shared_with_user_id = auth.uid() 
                AND status = 'accepted'
                AND role = 'editor'
            )
        )
    );

-- Marketplace applications don't need brand-specific policies as they're global
CREATE POLICY "Users can view marketplace applications" 
    ON public.ugc_marketplace_applications FOR SELECT
    USING (true); -- All authenticated users can view applications

CREATE POLICY "Anyone can create marketplace applications" 
    ON public.ugc_marketplace_applications FOR INSERT
    WITH CHECK (true); -- Anyone can apply

CREATE POLICY "Users can update their own marketplace applications" 
    ON public.ugc_marketplace_applications FOR UPDATE
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));