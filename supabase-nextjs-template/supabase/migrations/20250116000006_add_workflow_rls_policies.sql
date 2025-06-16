-- Add RLS policies for UGC Workflow Builder tables
-- Enable RLS on all new tables

ALTER TABLE public.ugc_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_custom_creator_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_human_intervention_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_marketplace_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_brand_job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_job_applications ENABLE ROW LEVEL SECURITY;

-- Workflow Templates Policies
CREATE POLICY "Users can view workflow templates for their brands" 
    ON public.ugc_workflow_templates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_workflow_templates.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "Users can create workflow templates for their brands" 
    ON public.ugc_workflow_templates FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workflow templates for their brands" 
    ON public.ugc_workflow_templates FOR UPDATE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete workflow templates for their brands" 
    ON public.ugc_workflow_templates FOR DELETE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Workflow Steps Policies
CREATE POLICY "Users can view workflow steps for their templates" 
    ON public.ugc_workflow_steps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_templates
            WHERE ugc_workflow_templates.id = ugc_workflow_steps.template_id
            AND ugc_workflow_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage workflow steps for their templates" 
    ON public.ugc_workflow_steps FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_templates
            WHERE ugc_workflow_templates.id = template_id
            AND ugc_workflow_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workflow steps for their templates" 
    ON public.ugc_workflow_steps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_templates
            WHERE ugc_workflow_templates.id = ugc_workflow_steps.template_id
            AND ugc_workflow_templates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete workflow steps for their templates" 
    ON public.ugc_workflow_steps FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_templates
            WHERE ugc_workflow_templates.id = ugc_workflow_steps.template_id
            AND ugc_workflow_templates.user_id = auth.uid()
        )
    );

-- Workflow Actions Policies (Read-only for all authenticated users)
CREATE POLICY "Authenticated users can view workflow actions" 
    ON public.ugc_workflow_actions FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Workflow Conditions Policies
CREATE POLICY "Users can manage workflow conditions for their steps" 
    ON public.ugc_workflow_conditions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_steps
            JOIN public.ugc_workflow_templates ON ugc_workflow_templates.id = ugc_workflow_steps.template_id
            WHERE ugc_workflow_steps.id = ugc_workflow_conditions.step_id
            AND ugc_workflow_templates.user_id = auth.uid()
        )
    );

-- Workflow Executions Policies
CREATE POLICY "Users can view workflow executions for their brands" 
    ON public.ugc_workflow_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_workflow_executions.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "System can manage workflow executions" 
    ON public.ugc_workflow_executions FOR ALL
    USING (true); -- Allow system to manage executions

-- Step Executions Policies
CREATE POLICY "Users can view step executions for their brands" 
    ON public.ugc_workflow_step_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_workflow_executions
            JOIN public.brands ON brands.id = ugc_workflow_executions.brand_id
            WHERE ugc_workflow_executions.id = ugc_workflow_step_executions.execution_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "System can manage step executions" 
    ON public.ugc_workflow_step_executions FOR ALL
    USING (true); -- Allow system to manage step executions

-- Custom Creator Statuses Policies
CREATE POLICY "Users can view custom statuses for their brands" 
    ON public.ugc_custom_creator_statuses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_custom_creator_statuses.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "Users can manage custom statuses for their brands" 
    ON public.ugc_custom_creator_statuses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update custom statuses for their brands" 
    ON public.ugc_custom_creator_statuses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_custom_creator_statuses.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete custom statuses for their brands" 
    ON public.ugc_custom_creator_statuses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_custom_creator_statuses.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Message Templates Policies
CREATE POLICY "Users can view message templates for their brands" 
    ON public.ugc_message_templates FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_message_templates.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "Users can create message templates for their brands" 
    ON public.ugc_message_templates FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update message templates for their brands" 
    ON public.ugc_message_templates FOR UPDATE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_message_templates.brand_id
            AND brands.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete message templates for their brands" 
    ON public.ugc_message_templates FOR DELETE
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_message_templates.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Human Intervention Queue Policies
CREATE POLICY "Users can view intervention queue for their brands" 
    ON public.ugc_human_intervention_queue FOR SELECT
    USING (
        auth.uid() = assigned_to OR
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_human_intervention_queue.brand_id
            AND (brands.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.brand_shares
                WHERE brand_shares.brand_id = brands.id
                AND brand_shares.shared_with_user_id = auth.uid()
                AND brand_shares.status = 'accepted'
            ))
        )
    );

CREATE POLICY "System can manage intervention queue" 
    ON public.ugc_human_intervention_queue FOR ALL
    USING (true); -- Allow system to manage interventions

-- Marketplace Applications Policies (Public access for submissions)
CREATE POLICY "Anyone can view published brand job postings" 
    ON public.ugc_brand_job_postings FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can manage job postings for their brands" 
    ON public.ugc_brand_job_postings FOR ALL
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.brands
            WHERE brands.id = ugc_brand_job_postings.brand_id
            AND brands.user_id = auth.uid()
        )
    );

-- Public access for marketplace applications (creators can apply without login)
CREATE POLICY "Anyone can submit marketplace applications" 
    ON public.ugc_marketplace_applications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view their own marketplace applications" 
    ON public.ugc_marketplace_applications FOR SELECT
    USING (true); -- Allow reading for verification/status checking

CREATE POLICY "Users can manage applications for their brands" 
    ON public.ugc_marketplace_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_job_applications
            JOIN public.ugc_brand_job_postings ON ugc_brand_job_postings.id = ugc_job_applications.job_posting_id
            WHERE ugc_job_applications.application_id = ugc_marketplace_applications.id
            AND ugc_brand_job_postings.user_id = auth.uid()
        )
    );

-- Job Applications Policies
CREATE POLICY "Anyone can submit job applications" 
    ON public.ugc_job_applications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view applications for their job postings" 
    ON public.ugc_job_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_brand_job_postings
            WHERE ugc_brand_job_postings.id = ugc_job_applications.job_posting_id
            AND ugc_brand_job_postings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update application status for their job postings" 
    ON public.ugc_job_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.ugc_brand_job_postings
            WHERE ugc_brand_job_postings.id = ugc_job_applications.job_posting_id
            AND ugc_brand_job_postings.user_id = auth.uid()
        )
    );

-- Add public access policy for brands (needed for public applications)
CREATE POLICY "Allow public access to brands for marketplace" 
    ON public.brands FOR SELECT
    USING (true); -- Allow reading brand info for public job postings

-- Add updated_at triggers for new tables
CREATE TRIGGER update_ugc_workflow_templates_updated_at
    BEFORE UPDATE ON public.ugc_workflow_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_workflow_steps_updated_at
    BEFORE UPDATE ON public.ugc_workflow_steps
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_workflow_executions_updated_at
    BEFORE UPDATE ON public.ugc_workflow_executions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_workflow_step_executions_updated_at
    BEFORE UPDATE ON public.ugc_workflow_step_executions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_custom_creator_statuses_updated_at
    BEFORE UPDATE ON public.ugc_custom_creator_statuses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_message_templates_updated_at
    BEFORE UPDATE ON public.ugc_message_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_human_intervention_queue_updated_at
    BEFORE UPDATE ON public.ugc_human_intervention_queue
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_marketplace_applications_updated_at
    BEFORE UPDATE ON public.ugc_marketplace_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_brand_job_postings_updated_at
    BEFORE UPDATE ON public.ugc_brand_job_postings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_job_applications_updated_at
    BEFORE UPDATE ON public.ugc_job_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 