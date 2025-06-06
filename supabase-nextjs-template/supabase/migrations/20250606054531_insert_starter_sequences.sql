-- Insert Starter Email Sequence Templates
-- These serve as foundations that the AI coordinator can use and modify

-- Helper function to get brand ID (you'll need to replace with actual brand ID)
-- This is just an example - in practice, these would be created per brand

-- Sequence 1: New Creator Onboarding
INSERT INTO ugc_email_sequences (
    name,
    description,
    brand_id,
    trigger_event,
    trigger_conditions,
    is_active,
    created_by
) VALUES (
    'New Creator Onboarding',
    'Welcome sequence for newly added creators to guide them through the onboarding process',
    '00000000-0000-0000-0000-000000000000', -- Placeholder - will be updated per brand
    'status_change',
    '{"from_status": null, "to_status": "ADDED"}'::jsonb,
    false, -- Inactive by default, AI will activate when needed
    null
);

-- Get the sequence ID for steps
-- Note: In practice, this would be done programmatically
-- For now, we'll insert steps with placeholder sequence_id

-- Onboarding Step 1: Welcome Email
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content,
    status_change_action
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'New Creator Onboarding' LIMIT 1),
    1,
    'Welcome & Next Steps',
    0,
    0,
    'Welcome to {{brand_name}} - Let\'s Get Started! 🎉',
    '<h2>Welcome to the {{brand_name}} Creator Family!</h2>
    <p>Hi {{creator_name}},</p>
    <p>We\'re thrilled to have you join our creator community! Here\'s what happens next:</p>
    <h3>📋 Next Steps:</h3>
    <ol>
        <li><strong>Contract Review</strong> - You\'ll receive a creator agreement within 24 hours</li>
        <li><strong>Product Shipping</strong> - Once signed, we\'ll ship your products</li>
        <li><strong>Script Creation</strong> - We\'ll create custom scripts tailored to your style</li>
    </ol>
    <p>Questions? Simply reply to this email - we\'re here to help!</p>
    <p>Welcome aboard! 🚀</p>
    <p>The {{brand_name}} Team</p>',
    'Welcome to {{brand_name}}!\n\nHi {{creator_name}},\n\nWe\'re thrilled to have you join our creator community!\n\nNext Steps:\n1. Contract Review - You\'ll receive a creator agreement within 24 hours\n2. Product Shipping - Once signed, we\'ll ship your products\n3. Script Creation - We\'ll create custom scripts tailored to your style\n\nQuestions? Simply reply to this email.\n\nWelcome aboard!\nThe {{brand_name}} Team',
    'AWAITING CONTRACT'
);

-- Onboarding Step 2: Contract Follow-up
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content,
    conditions
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'New Creator Onboarding' LIMIT 1),
    2,
    'Contract Follow-up',
    2,
    0,
    'Quick Follow-up: Creator Agreement for {{brand_name}}',
    '<p>Hi {{creator_name}},</p>
    <p>Just checking in about the creator agreement we sent a couple days ago.</p>
    <p>If you have any questions about the terms or need clarification on anything, I\'m here to help!</p>
    <p>Once signed, we\'ll get your products shipped out right away.</p>
    <p>Looking forward to working with you!</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nJust checking in about the creator agreement we sent a couple days ago.\n\nIf you have any questions about the terms or need clarification, I\'m here to help!\n\nOnce signed, we\'ll get your products shipped out right away.\n\nLooking forward to working with you!\n\nBest,\n{{brand_name}} Team',
    '{"only_if_status": "AWAITING CONTRACT"}'::jsonb
);

-- Sequence 2: No Response Follow-up
INSERT INTO ugc_email_sequences (
    name,
    description,
    brand_id,
    trigger_event,
    trigger_conditions,
    is_active,
    created_by
) VALUES (
    'No Response Follow-up',
    'Gentle follow-up sequence for creators who haven\'t responded to initial outreach',
    '00000000-0000-0000-0000-000000000000',
    'no_response',
    '{"days_since_last_contact": 3, "max_attempts": 3}'::jsonb,
    false,
    null
);

-- No Response Step 1: Gentle Follow-up
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'No Response Follow-up' LIMIT 1),
    1,
    'Gentle Follow-up',
    0,
    0,
    'Following up: Partnership with {{brand_name}}',
    '<p>Hi {{creator_name}},</p>
    <p>I wanted to follow up on my previous message about partnering with {{brand_name}}.</p>
    <p>I know you\'re probably busy, but I\'d love to chat about how we can work together to create amazing content that resonates with your audience.</p>
    <p>Would you be interested in a quick 15-minute call this week?</p>
    <p>Looking forward to hearing from you!</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nI wanted to follow up on my previous message about partnering with {{brand_name}}.\n\nI know you\'re probably busy, but I\'d love to chat about how we can work together.\n\nWould you be interested in a quick 15-minute call this week?\n\nLooking forward to hearing from you!\n\nBest,\n{{brand_name}} Team'
);

-- No Response Step 2: Value-focused Follow-up
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'No Response Follow-up' LIMIT 1),
    2,
    'Value-focused Follow-up',
    5,
    0,
    'Last chance: {{brand_name}} creator opportunity',
    '<p>Hi {{creator_name}},</p>
    <p>This is my final follow-up about the {{brand_name}} creator opportunity.</p>
    <p><strong>What you\'d get:</strong></p>
    <ul>
        <li>Free products to try and keep</li>
        <li>Competitive compensation per post</li>
        <li>Custom scripts written for your voice</li>
        <li>Flexible timeline that works with your schedule</li>
    </ul>
    <p>If you\'re not interested, no worries at all - just let me know and I won\'t bother you again.</p>
    <p>But if you\'d like to learn more, I\'m here!</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nThis is my final follow-up about the {{brand_name}} creator opportunity.\n\nWhat you\'d get:\n- Free products to try and keep\n- Competitive compensation per post\n- Custom scripts written for your voice\n- Flexible timeline\n\nIf you\'re not interested, no worries - just let me know.\n\nBut if you\'d like to learn more, I\'m here!\n\nBest,\n{{brand_name}} Team'
);

-- Sequence 3: Call Scheduling
INSERT INTO ugc_email_sequences (
    name,
    description,
    brand_id,
    trigger_event,
    trigger_conditions,
    is_active,
    created_by
) VALUES (
    'Call Scheduling Follow-up',
    'Follow-up sequence for creators who need to schedule discovery calls',
    '00000000-0000-0000-0000-000000000000',
    'status_change',
    '{"to_status": "SCHEDULE CALL"}'::jsonb,
    false,
    null
);

-- Call Scheduling Step 1: Calendar Link
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content,
    status_change_action
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'Call Scheduling Follow-up' LIMIT 1),
    1,
    'Send Calendar Link',
    0,
    0,
    'Let\'s schedule your {{brand_name}} discovery call! 📅',
    '<p>Hi {{creator_name}},</p>
    <p>Great news - you\'re approved to move forward with {{brand_name}}!</p>
    <p>The next step is a quick 15-20 minute discovery call where we\'ll:</p>
    <ul>
        <li>Learn more about your content style and audience</li>
        <li>Discuss compensation and timeline</li>
        <li>Answer any questions you have</li>
        <li>Get you set up for success</li>
    </ul>
    <p><strong><a href="{{calendar_link}}">Click here to book your call</a></strong></p>
    <p>Looking forward to chatting soon!</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nGreat news - you\'re approved to move forward with {{brand_name}}!\n\nThe next step is a quick 15-20 minute discovery call where we\'ll:\n- Learn about your content style and audience\n- Discuss compensation and timeline\n- Answer any questions\n- Get you set up for success\n\nBook your call: {{calendar_link}}\n\nLooking forward to chatting soon!\n\nBest,\n{{brand_name}} Team',
    'CALL SCHEDULED'
);

-- Call Scheduling Step 2: Follow-up
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content,
    conditions
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'Call Scheduling Follow-up' LIMIT 1),
    2,
    'Call Scheduling Follow-up',
    3,
    0,
    'Quick follow-up: Your {{brand_name}} discovery call',
    '<p>Hi {{creator_name}},</p>
    <p>I wanted to follow up about scheduling your discovery call with {{brand_name}}.</p>
    <p>I know it can be easy to forget with busy schedules, so here\'s the link again:</p>
    <p><strong><a href="{{calendar_link}}">Book your 15-minute call here</a></strong></p>
    <p>This is just a casual chat to see if we\'re a good fit for each other - no pressure!</p>
    <p>If you have any questions or concerns, feel free to reply to this email.</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nI wanted to follow up about scheduling your discovery call with {{brand_name}}.\n\nI know it can be easy to forget with busy schedules, so here\'s the link again:\n\nBook your 15-minute call: {{calendar_link}}\n\nThis is just a casual chat to see if we\'re a good fit - no pressure!\n\nIf you have questions, feel free to reply.\n\nBest,\n{{brand_name}} Team',
    '{"only_if_status": "SCHEDULE CALL"}'::jsonb
);

-- Sequence 4: Product Shipping Updates
INSERT INTO ugc_email_sequences (
    name,
    description,
    brand_id,
    trigger_event,
    trigger_conditions,
    is_active,
    created_by
) VALUES (
    'Product Shipping Updates',
    'Keep creators informed about product shipping status and set expectations',
    '00000000-0000-0000-0000-000000000000',
    'status_change',
    '{"to_status": "SHIPPING PRODUCT"}'::jsonb,
    false,
    null
);

-- Product Shipping Step 1: Shipping Notification
INSERT INTO ugc_email_sequence_steps (
    sequence_id,
    step_order,
    name,
    delay_days,
    delay_hours,
    custom_subject,
    custom_html_content,
    custom_text_content,
    status_change_action
) VALUES (
    (SELECT id FROM ugc_email_sequences WHERE name = 'Product Shipping Updates' LIMIT 1),
    1,
    'Shipping Notification',
    0,
    0,
    'Your {{brand_name}} products are on the way! 📦',
    '<p>Hi {{creator_name}},</p>
    <p>Exciting news - your {{brand_name}} products have been shipped!</p>
    <p><strong>What to expect:</strong></p>
    <ul>
        <li>Delivery in 3-5 business days</li>
        <li>You\'ll receive tracking information soon</li>
        <li>Try the products for at least a week before filming</li>
        <li>We\'ll send your custom scripts once products arrive</li>
    </ul>
    <p>We can\'t wait to see what you create!</p>
    <p>Best,<br>{{brand_name}} Team</p>',
    'Hi {{creator_name}},\n\nExciting news - your {{brand_name}} products have been shipped!\n\nWhat to expect:\n- Delivery in 3-5 business days\n- You\'ll receive tracking information soon\n- Try the products for at least a week before filming\n- We\'ll send custom scripts once products arrive\n\nWe can\'t wait to see what you create!\n\nBest,\n{{brand_name}} Team',
    'PRODUCT SHIPPED'
);

-- Add comments to document the templates
COMMENT ON TABLE ugc_email_sequences IS 'Email sequences include starter templates that AI can modify and customize';
COMMENT ON TABLE ugc_email_sequence_steps IS 'Sequence steps support variable substitution using {{variable_name}} syntax';

-- Create a function to clone sequences for new brands
CREATE OR REPLACE FUNCTION clone_starter_sequences_for_brand(target_brand_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    sequence_record RECORD;
    step_record RECORD;
    new_sequence_id UUID;
    sequences_created INTEGER := 0;
BEGIN
    -- Clone all starter sequences (those with placeholder brand_id)
    FOR sequence_record IN 
        SELECT * FROM ugc_email_sequences 
        WHERE brand_id = '00000000-0000-0000-0000-000000000000'
    LOOP
        -- Create new sequence for the target brand
        INSERT INTO ugc_email_sequences (
            name, description, brand_id, trigger_event, trigger_conditions,
            is_active, created_by
        ) VALUES (
            sequence_record.name,
            sequence_record.description,
            target_brand_id,
            sequence_record.trigger_event,
            sequence_record.trigger_conditions,
            false, -- Keep inactive until AI decides to use them
            user_id
        ) RETURNING id INTO new_sequence_id;
        
        -- Clone all steps for this sequence
        FOR step_record IN
            SELECT * FROM ugc_email_sequence_steps
            WHERE sequence_id = sequence_record.id
            ORDER BY step_order
        LOOP
            INSERT INTO ugc_email_sequence_steps (
                sequence_id, step_order, name, delay_days, delay_hours,
                email_template_id, custom_subject, custom_html_content,
                custom_text_content, status_change_action, conditions
            ) VALUES (
                new_sequence_id,
                step_record.step_order,
                step_record.name,
                step_record.delay_days,
                step_record.delay_hours,
                step_record.email_template_id,
                step_record.custom_subject,
                step_record.custom_html_content,
                step_record.custom_text_content,
                step_record.status_change_action,
                step_record.conditions
            );
        END LOOP;
        
        sequences_created := sequences_created + 1;
    END LOOP;
    
    RETURN sequences_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clone_starter_sequences_for_brand IS 'Clones starter sequence templates for a new brand, allowing AI to customize them'; 