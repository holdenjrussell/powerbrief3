-- Create sample default workflow for creator onboarding
-- This migration creates a comprehensive sample workflow that demonstrates all features

-- Function to create sample workflow for a brand
CREATE OR REPLACE FUNCTION create_sample_creator_onboarding_workflow(brand_uuid UUID, user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    workflow_id UUID;
    step1_id UUID;
    step2_id UUID;
    step3_id UUID;
    step4_id UUID;
    step5_id UUID;
    step6_id UUID;
    step7_id UUID;
    step8_id UUID;
    step9_id UUID;
    step10_id UUID;
    step11_id UUID;
    step12_id UUID;
    step13_id UUID;
    step14_id UUID;
    step15_id UUID;
BEGIN
    -- Create the main workflow template
    INSERT INTO public.ugc_workflow_templates (
        brand_id,
        user_id,
        name,
        description,
        category,
        trigger_event,
        is_active
    ) VALUES (
        brand_uuid,
        user_uuid,
        'Complete Creator Onboarding & Script Pipeline',
        'Comprehensive workflow handling creator onboarding, script assignment, rate negotiation, product shipment, content creation, and approval process',
        'onboarding',
        'creator_added',
        true
    ) RETURNING id INTO workflow_id;

    -- Step 1: Check Creator Source
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        1,
        'Check Creator Source',
        'Determine if creator was added via onboarding form or manually',
        'condition',
        jsonb_build_object(
            'condition_type', 'field_contains',
            'field_name', 'creator.source',
            'operator', 'equals',
            'expected_value', 'onboarding_form',
            'true_step_name', 'Send Welcome Email',
            'false_step_name', 'Check Email Availability'
        )
    ) RETURNING id INTO step1_id;

    -- Step 2: Check Email Availability (for manual additions)
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        2,
        'Check Email Availability',
        'Check if manually added creator has email address',
        'condition',
        jsonb_build_object(
            'condition_type', 'field_exists',
            'field_name', 'creator.email',
            'operator', 'exists',
            'true_step_name', 'Send Onboarding Form',
            'false_step_name', 'Human Review - Missing Email'
        )
    ) RETURNING id INTO step2_id;

    -- Step 3: Human Review - Missing Email
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        3,
        'Human Review - Missing Email',
        'Manual intervention required: Creator has no email address',
        'human_intervention',
        jsonb_build_object(
            'title', 'Creator Missing Email Address',
            'description', 'This creator was added manually but has no email address. Please collect their email to proceed with onboarding.',
            'priority', 'high',
            'required_fields', jsonb_build_array('email'),
            'next_step_name', 'Send Onboarding Form'
        )
    ) RETURNING id INTO step3_id;

    -- Step 4: Send Onboarding Form
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        4,
        'Send Onboarding Form',
        'Send prefilled onboarding form to manually added creators',
        'action',
        jsonb_build_object(
            'action_id', 'send_email',
            'action_inputs', jsonb_build_object(
                'template_name', 'onboarding_form_request',
                'subject', 'Complete Your Creator Profile - {brand_name}',
                'variables', jsonb_build_object(
                    'creator_name', '{creator.name}',
                    'brand_name', '{brand.name}',
                    'onboarding_link', '{onboarding_form_url}'
                )
            ),
            'next_step_name', 'Send Welcome Email'
        )
    ) RETURNING id INTO step4_id;

    -- Step 5: Send Welcome Email
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        5,
        'Send Welcome Email',
        'Send welcome email acknowledging creator submission',
        'action',
        jsonb_build_object(
            'action_id', 'send_email',
            'action_inputs', jsonb_build_object(
                'template_name', 'creator_welcome',
                'subject', 'Welcome to {brand_name} - We received your submission!',
                'variables', jsonb_build_object(
                    'creator_name', '{creator.name}',
                    'brand_name', '{brand.name}'
                )
            ),
            'next_step_name', 'Wait for Portfolio Review'
        )
    ) RETURNING id INTO step5_id;

    -- Step 6: Wait for Portfolio Review
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        6,
        'Wait for Portfolio Review',
        'Wait for human review of creator portfolio and social media',
        'human_intervention',
        jsonb_build_object(
            'title', 'Review Creator Portfolio',
            'description', 'Review the creator''s portfolio, social media handles, and overall fit for the brand.',
            'priority', 'medium',
            'context_fields', jsonb_build_array('portfolio_link', 'instagram_handle', 'tiktok_handle'),
            'actions', jsonb_build_array(
                jsonb_build_object('action', 'approve_to_shortlist', 'label', 'Move to Primary Screen'),
                jsonb_build_object('action', 'reject', 'label', 'Reject Creator')
            )
        )
    ) RETURNING id INTO step6_id;

    -- Step 7: Check Portfolio Review Result
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        7,
        'Check Portfolio Review Result',
        'Check if creator was approved for primary screen',
        'condition',
        jsonb_build_object(
            'condition_type', 'status_equals',
            'field_name', 'creator.status',
            'operator', 'equals',
            'expected_value', 'Primary Screen',
            'true_step_name', 'Wait for Final Approval',
            'false_step_name', 'End Workflow'
        )
    ) RETURNING id INTO step7_id;

    -- Step 8: Wait for Final Approval
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        8,
        'Wait for Final Approval',
        'Final human approval to move creator to next steps',
        'human_intervention',
        jsonb_build_object(
            'title', 'Final Creator Approval',
            'description', 'Make final decision on creator approval for script assignments.',
            'priority', 'medium',
            'actions', jsonb_build_array(
                jsonb_build_object('action', 'approve_for_scripts', 'label', 'Approve for Next Steps'),
                jsonb_build_object('action', 'move_to_backlog', 'label', 'Move to Backlog')
            )
        )
    ) RETURNING id INTO step8_id;

    -- Step 9: Send Approval Email
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        9,
        'Send Approval Email',
        'Send email notifying creator of approval',
        'action',
        jsonb_build_object(
            'action_id', 'send_email',
            'action_inputs', jsonb_build_object(
                'template_name', 'creator_approved',
                'subject', 'Congratulations! You''re approved for {brand_name} collaborations',
                'variables', jsonb_build_object(
                    'creator_name', '{creator.name}',
                    'brand_name', '{brand.name}'
                )
            ),
            'next_step_name', 'AI Response Analysis'
        )
    ) RETURNING id INTO step9_id;

    -- Step 10: AI Response Analysis
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        10,
        'AI Response Analysis',
        'AI analyzes creator response to determine next action',
        'action',
        jsonb_build_object(
            'action_id', 'ai_generate',
            'action_inputs', jsonb_build_object(
                'prompt', 'Analyze the creator''s email response and determine the appropriate next action',
                'available_actions', jsonb_build_array('rate_negotiation', 'script_request', 'general_inquiry'),
                'context_fields', jsonb_build_array('email_content', 'creator_profile')
            ),
            'next_step_name', 'Route Based on AI Analysis'
        )
    ) RETURNING id INTO step10_id;

    -- Step 11: Route Based on AI Analysis
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        11,
        'Route Based on AI Analysis',
        'Route to appropriate workflow based on AI analysis',
        'condition',
        jsonb_build_object(
            'condition_type', 'field_contains',
            'field_name', 'ai_analysis.action',
            'operator', 'equals',
            'expected_value', 'rate_negotiation',
            'true_step_name', 'Handle Rate Negotiation',
            'false_step_name', 'Check for Script Request'
        )
    ) RETURNING id INTO step11_id;

    -- Step 12: Check for Script Request
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        12,
        'Check for Script Request',
        'Check if creator requested to see scripts first',
        'condition',
        jsonb_build_object(
            'condition_type', 'field_contains',
            'field_name', 'ai_analysis.action',
            'operator', 'equals',
            'expected_value', 'script_request',
            'true_step_name', 'Human Script Assignment',
            'false_step_name', 'Handle General Inquiry'
        )
    ) RETURNING id INTO step12_id;

    -- Step 13: Handle Rate Negotiation
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        13,
        'Handle Rate Negotiation',
        'AI handles rate negotiation with creator',
        'action',
        jsonb_build_object(
            'action_id', 'ai_generate',
            'action_inputs', jsonb_build_object(
                'prompt', 'Engage in rate negotiation with the creator. Be professional and aim to reach a mutually beneficial agreement.',
                'context_fields', jsonb_build_array('creator_rates', 'brand_budget', 'previous_negotiations'),
                'max_iterations', 3
            ),
            'next_step_name', 'Human Script Assignment'
        )
    ) RETURNING id INTO step13_id;

    -- Step 14: Human Script Assignment
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        14,
        'Human Script Assignment',
        'Human assigns scripts to creator',
        'human_intervention',
        jsonb_build_object(
            'title', 'Assign Scripts to Creator',
            'description', 'Select and assign appropriate scripts to this creator based on their profile and the conversation context.',
            'priority', 'high',
            'context_fields', jsonb_build_array('conversation_history', 'creator_content_types', 'available_scripts'),
            'required_actions', jsonb_build_array('assign_scripts')
        )
    ) RETURNING id INTO step14_id;

    -- Step 15: Handle General Inquiry
    INSERT INTO public.ugc_workflow_steps (
        workflow_id,
        step_order,
        name,
        description,
        step_type,
        config
    ) VALUES (
        workflow_id,
        15,
        'Handle General Inquiry',
        'AI handles general inquiries from creator',
        'action',
        jsonb_build_object(
            'action_id', 'ai_generate',
            'action_inputs', jsonb_build_object(
                'prompt', 'Respond to the creator''s general inquiry professionally and helpfully.',
                'context_fields', jsonb_build_array('inquiry_content', 'brand_info', 'creator_profile')
            ),
            'next_step_name', 'Human Script Assignment'
        )
    ) RETURNING id INTO step15_id;

    -- Create workflow conditions for routing
    INSERT INTO public.ugc_workflow_conditions (step_id, condition_type, field_name, operator, expected_value, next_step_id)
    VALUES 
        (step1_id, 'field_contains', 'creator.source', 'equals', 'onboarding_form', step5_id),
        (step1_id, 'field_contains', 'creator.source', 'not_equals', 'onboarding_form', step2_id),
        (step2_id, 'field_exists', 'creator.email', 'exists', NULL, step4_id),
        (step2_id, 'field_exists', 'creator.email', 'not_exists', NULL, step3_id),
        (step7_id, 'status_equals', 'creator.status', 'equals', 'Primary Screen', step8_id),
        (step11_id, 'field_contains', 'ai_analysis.action', 'equals', 'rate_negotiation', step13_id),
        (step11_id, 'field_contains', 'ai_analysis.action', 'not_equals', 'rate_negotiation', step12_id),
        (step12_id, 'field_contains', 'ai_analysis.action', 'equals', 'script_request', step14_id),
        (step12_id, 'field_contains', 'ai_analysis.action', 'not_equals', 'script_request', step15_id);

    RETURN workflow_id;
END;
$$ LANGUAGE plpgsql;

-- Create sample message templates
INSERT INTO public.ugc_message_templates (brand_id, user_id, name, template_type, subject, content, variables, is_ai_generated)
SELECT 
    b.id as brand_id,
    b.user_id,
    'Creator Welcome Email',
    'email',
    'Welcome to {brand_name} - We received your submission!',
    'Hi {creator_name},

Thank you for your interest in collaborating with {brand_name}! We''ve received your creator application and are excited to review your portfolio.

Our team will review your submission within 2-3 business days and get back to you with next steps. In the meantime, feel free to check out our brand guidelines and recent campaigns.

Best regards,
The {brand_name} Team',
    ARRAY['{creator_name}', '{brand_name}'],
    false
FROM public.brands b
WHERE NOT EXISTS (
    SELECT 1 FROM public.ugc_message_templates 
    WHERE brand_id = b.id AND name = 'Creator Welcome Email'
);

INSERT INTO public.ugc_message_templates (brand_id, user_id, name, template_type, subject, content, variables, is_ai_generated)
SELECT 
    b.id as brand_id,
    b.user_id,
    'Creator Approved Email',
    'email',
    'Congratulations! You''re approved for {brand_name} collaborations',
    'Hi {creator_name},

Great news! After reviewing your portfolio and social media presence, we''d love to work with you on some exciting {brand_name} content.

We''ll be in touch soon with script opportunities and collaboration details. We''re looking forward to creating amazing content together!

Next steps:
- We''ll send you script options within the next few days
- Rate discussions and project timelines will follow
- Product samples will be shipped once projects are confirmed

Welcome to the {brand_name} creator family!

Best regards,
The {brand_name} Team',
    ARRAY['{creator_name}', '{brand_name}'],
    false
FROM public.brands b
WHERE NOT EXISTS (
    SELECT 1 FROM public.ugc_message_templates 
    WHERE brand_id = b.id AND name = 'Creator Approved Email'
);

INSERT INTO public.ugc_message_templates (brand_id, user_id, name, template_type, subject, content, variables, is_ai_generated)
SELECT 
    b.id as brand_id,
    b.user_id,
    'Onboarding Form Request',
    'email',
    'Complete Your Creator Profile - {brand_name}',
    'Hi {creator_name},

We''d love to learn more about you and your content creation style! Please complete your creator profile using the link below:

{onboarding_link}

This will help us understand your content style, audience, and collaboration preferences so we can match you with the perfect projects.

The form takes just a few minutes to complete and includes:
- Portfolio and social media links
- Content creation experience
- Preferred collaboration types
- Rate and timeline preferences

Looking forward to working with you!

Best regards,
The {brand_name} Team',
    ARRAY['{creator_name}', '{brand_name}', '{onboarding_link}'],
    false
FROM public.brands b
WHERE NOT EXISTS (
    SELECT 1 FROM public.ugc_message_templates 
    WHERE brand_id = b.id AND name = 'Onboarding Form Request'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_sample_creator_onboarding_workflow(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION create_sample_creator_onboarding_workflow IS 'Creates a comprehensive sample workflow for creator onboarding and script pipeline management';