-- Email Sequences System for Creator Communications
-- This migration creates tables for automated email sequences, communication logs, and sequence tracking

-- Email Sequences table - defines sequences of emails
CREATE TABLE ugc_email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    trigger_event VARCHAR(100) NOT NULL, -- 'status_change', 'no_response', 'manual', etc.
    trigger_conditions JSONB, -- Additional trigger conditions like status values, time delays
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Email Sequence Steps table - individual emails in a sequence
CREATE TABLE ugc_email_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES ugc_email_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    delay_days INTEGER DEFAULT 0, -- Days to wait before sending this step
    delay_hours INTEGER DEFAULT 0, -- Additional hours to wait
    email_template_id UUID REFERENCES ugc_email_templates(id),
    custom_subject VARCHAR(500),
    custom_html_content TEXT,
    custom_text_content TEXT,
    status_change_action VARCHAR(100), -- Optional status to change creator to when step executes
    conditions JSONB, -- Conditions that must be met for this step to execute
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

-- Creator Sequence Enrollments table - tracks which creators are in which sequences
CREATE TABLE ugc_creator_sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES ugc_creators(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES ugc_email_sequences(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_send_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_step_sent_at TIMESTAMP WITH TIME ZONE,
    enrollment_trigger VARCHAR(100), -- What triggered the enrollment
    metadata JSONB, -- Additional enrollment metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(creator_id, sequence_id) -- One enrollment per creator per sequence
);

-- Communication Log table - comprehensive log of all creator interactions
CREATE TABLE ugc_creator_communication_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES ugc_creators(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    log_type VARCHAR(50) NOT NULL, -- 'email_sent', 'email_received', 'status_change', 'note', 'sequence_enrollment', 'ai_analysis'
    source VARCHAR(50) NOT NULL, -- 'manual', 'ai_coordinator', 'sequence', 'webhook'
    subject VARCHAR(500),
    content TEXT,
    metadata JSONB, -- Additional data like email IDs, old/new status values, AI analysis results
    email_thread_id UUID REFERENCES ugc_email_threads(id),
    email_message_id UUID REFERENCES ugc_email_messages(id),
    sequence_enrollment_id UUID REFERENCES ugc_creator_sequence_enrollments(id),
    ai_coordinator_action_id UUID REFERENCES ugc_ai_coordinator_actions(id),
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence Execution Log table - tracks execution of sequence steps
CREATE TABLE ugc_sequence_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES ugc_creator_sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES ugc_email_sequence_steps(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES ugc_creators(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'
    email_message_id UUID REFERENCES ugc_email_messages(id),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ugc_email_sequences_brand_id ON ugc_email_sequences(brand_id);
CREATE INDEX idx_ugc_email_sequences_trigger_event ON ugc_email_sequences(trigger_event);
CREATE INDEX idx_ugc_email_sequences_active ON ugc_email_sequences(is_active);

CREATE INDEX idx_ugc_email_sequence_steps_sequence_id ON ugc_email_sequence_steps(sequence_id);
CREATE INDEX idx_ugc_email_sequence_steps_order ON ugc_email_sequence_steps(sequence_id, step_order);

CREATE INDEX idx_ugc_creator_sequence_enrollments_creator_id ON ugc_creator_sequence_enrollments(creator_id);
CREATE INDEX idx_ugc_creator_sequence_enrollments_sequence_id ON ugc_creator_sequence_enrollments(sequence_id);
CREATE INDEX idx_ugc_creator_sequence_enrollments_status ON ugc_creator_sequence_enrollments(status);
CREATE INDEX idx_ugc_creator_sequence_enrollments_next_send ON ugc_creator_sequence_enrollments(next_send_at);

CREATE INDEX idx_ugc_creator_communication_log_creator_id ON ugc_creator_communication_log(creator_id);
CREATE INDEX idx_ugc_creator_communication_log_brand_id ON ugc_creator_communication_log(brand_id);
CREATE INDEX idx_ugc_creator_communication_log_type ON ugc_creator_communication_log(log_type);
CREATE INDEX idx_ugc_creator_communication_log_created_at ON ugc_creator_communication_log(created_at);

CREATE INDEX idx_ugc_sequence_execution_log_enrollment_id ON ugc_sequence_execution_log(enrollment_id);
CREATE INDEX idx_ugc_sequence_execution_log_scheduled_at ON ugc_sequence_execution_log(scheduled_at);
CREATE INDEX idx_ugc_sequence_execution_log_status ON ugc_sequence_execution_log(status);

-- RLS Policies
ALTER TABLE ugc_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_creator_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_creator_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_sequence_execution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ugc_email_sequences
CREATE POLICY "Users can view sequences for their brands or shared brands" ON ugc_email_sequences
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares 
            WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create sequences for their brands" ON ugc_email_sequences
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sequences for their brands" ON ugc_email_sequences
    FOR UPDATE USING (
        brand_id IN (
            SELECT id FROM brands WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sequences for their brands" ON ugc_email_sequences
    FOR DELETE USING (
        brand_id IN (
            SELECT id FROM brands WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for ugc_email_sequence_steps
CREATE POLICY "Users can view sequence steps for accessible sequences" ON ugc_email_sequence_steps
    FOR SELECT USING (
        sequence_id IN (
            SELECT id FROM ugc_email_sequences
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares 
                WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage sequence steps for their sequences" ON ugc_email_sequence_steps
    FOR ALL USING (
        sequence_id IN (
            SELECT id FROM ugc_email_sequences
            WHERE brand_id IN (
                SELECT id FROM brands WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for ugc_creator_sequence_enrollments
CREATE POLICY "Users can view enrollments for accessible creators" ON ugc_creator_sequence_enrollments
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares 
            WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage enrollments for their brands" ON ugc_creator_sequence_enrollments
    FOR ALL USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares 
            WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
        )
    );

-- RLS Policies for ugc_creator_communication_log
CREATE POLICY "Users can view communication logs for accessible creators" ON ugc_creator_communication_log
    FOR SELECT USING (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares 
            WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can insert communication logs for accessible creators" ON ugc_creator_communication_log
    FOR INSERT WITH CHECK (
        brand_id IN (
            SELECT id FROM brands 
            WHERE user_id = auth.uid()
            UNION
            SELECT brand_id FROM brand_shares 
            WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
        )
    );

-- RLS Policies for ugc_sequence_execution_log
CREATE POLICY "Users can view execution logs for accessible enrollments" ON ugc_sequence_execution_log
    FOR SELECT USING (
        enrollment_id IN (
            SELECT id FROM ugc_creator_sequence_enrollments
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares 
                WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage execution logs for accessible enrollments" ON ugc_sequence_execution_log
    FOR ALL USING (
        enrollment_id IN (
            SELECT id FROM ugc_creator_sequence_enrollments
            WHERE brand_id IN (
                SELECT id FROM brands 
                WHERE user_id = auth.uid()
                UNION
                SELECT brand_id FROM brand_shares 
                WHERE shared_with_user_id = auth.uid() AND status = 'accepted'
            )
        )
    );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ugc_email_sequences_updated_at BEFORE UPDATE ON ugc_email_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ugc_email_sequence_steps_updated_at BEFORE UPDATE ON ugc_email_sequence_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ugc_creator_sequence_enrollments_updated_at BEFORE UPDATE ON ugc_creator_sequence_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log creator status changes
CREATE OR REPLACE FUNCTION log_creator_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ugc_creator_communication_log (
            creator_id,
            brand_id,
            log_type,
            source,
            subject,
            content,
            metadata,
            performed_by
        ) VALUES (
            NEW.id,
            NEW.brand_id,
            'status_change',
            'system',
            'Status Changed',
            'Creator status changed from "' || COALESCE(OLD.status, 'None') || '" to "' || COALESCE(NEW.status, 'None') || '"',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changed_at', NOW()
            ),
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically log status changes
CREATE TRIGGER log_ugc_creator_status_changes 
    AFTER UPDATE ON ugc_creators 
    FOR EACH ROW 
    EXECUTE FUNCTION log_creator_status_change();

-- Comments for documentation
COMMENT ON TABLE ugc_email_sequences IS 'Email sequences for automated creator communication';
COMMENT ON TABLE ugc_email_sequence_steps IS 'Individual steps/emails within sequences';
COMMENT ON TABLE ugc_creator_sequence_enrollments IS 'Tracks creator enrollment in sequences';
COMMENT ON TABLE ugc_creator_communication_log IS 'Comprehensive log of all creator interactions';
COMMENT ON TABLE ugc_sequence_execution_log IS 'Log of sequence step executions';
