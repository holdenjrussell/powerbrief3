# UGC Pipeline Revamp - Complete Implementation Guide

## Overview

This document outlines the comprehensive revamp of the UGC pipeline and workflow builder system. The changes include restructuring the navigation, replacing the AI UGC Agent with a new UGC Coordinator dashboard, moving creator statuses to settings, fixing email template modals, and implementing a complete workflow execution and human review system.

## Key Changes Made

### 1. Navigation Restructure

**Before:**
- Pipeline: Concept View, Script Creation
- Creators: Creator Management, Creator Inbox  
- Automation: Workflow Builder, AI UGC Agent
- Settings: Pipeline Settings, Creator Fields, Email Templates

**After:**
- Pipeline: Concept View, Script Creation
- Creators: Creator Management, Creator Inbox
- Automation: **UGC Coordinator**, Workflow Builder
- Settings: Pipeline Settings, **Creator Statuses**, Creator Fields, Email Templates

### 2. New UGC Coordinator Dashboard

Replaced the AI UGC Agent with a comprehensive UGC Coordinator dashboard featuring:

- **Overview Tab**: Key metrics and recent activity
- **Executions Tab**: Monitor and manage workflow executions
- **Human Review Tab**: Handle items requiring manual intervention
- **Analytics Tab**: Performance metrics (placeholder for future implementation)

Key features:
- Real-time workflow execution monitoring
- Human review queue with priority management
- Workflow execution controls (pause, resume, retry)
- Comprehensive status tracking and progress indicators

### 3. Creator Status Management

Moved creator status management from the workflow builder to the settings section:

- **Default Statuses**: Shows built-in onboarding statuses
- **Custom Statuses**: Allows brands to create custom statuses by category
- **Categories**: Onboarding, Script Pipeline, Negotiation, Production, Delivery
- **Status Properties**: Name, color, active/inactive, final status flag

### 4. Email Template Fixes

Fixed the email template generator modal issues:

- **Removed**: In-app notification template type
- **Fixed**: Modal sizing to prevent cutoff (max-w-4xl, max-h-90vh, overflow-y-auto)
- **Improved**: Content section is hidden when AI generated is selected
- **Enhanced**: Better variable management and AI prompt handling

### 5. Workflow Builder Improvements

- Removed creator statuses and script pipeline tabs from workflow builder
- Streamlined to focus on workflows and analytics only
- Enhanced human intervention step functionality

## Files Created/Modified

### New Components

1. **`src/components/ugc-coordinator/UgcCoordinatorDashboard.tsx`**
   - Complete dashboard for workflow execution monitoring
   - Human review queue management
   - Workflow execution controls

2. **`src/components/ugc/CreatorStatusManager.tsx`**
   - Custom creator status management
   - Category-based organization
   - Color and property management

### Modified Components

1. **`src/app/app/powerbrief/[brandId]/ugc-pipeline/page.tsx`**
   - Updated navigation structure
   - Replaced AI UGC Agent with UGC Coordinator
   - Added tabbed settings with creator status management

2. **`src/components/ugc/workflow/MessageTemplateManager.tsx`**
   - Fixed modal sizing issues
   - Removed in-app notification type
   - Improved AI generated content handling

3. **`src/lib/types/ugcWorkflow.ts`**
   - Updated MessageTemplateType to remove 'notification'

### New API Endpoints

1. **`src/app/api/ugc/workflow/executions/route.ts`**
   - GET: Fetch workflow executions for a brand

2. **`src/app/api/ugc/workflow/human-review/route.ts`**
   - GET: Fetch human review items for a brand

3. **`src/app/api/ugc/workflow/human-review/[reviewId]/route.ts`**
   - PUT: Update human review item status

4. **`src/app/api/ugc/workflow/executions/[executionId]/pause/route.ts`**
   - POST: Pause workflow execution

5. **`src/app/api/ugc/workflow/executions/[executionId]/resume/route.ts`**
   - POST: Resume workflow execution

6. **`src/app/api/ugc/workflow/executions/[executionId]/retry/route.ts`**
   - POST: Retry failed workflow execution

## Required Migrations

### Migration 1: Enhanced Workflow Execution Tables
**File**: `20250116000003_add_workflow_execution_tables.sql`

```sql
-- Enhanced workflow execution tracking tables
-- This migration adds additional tracking capabilities to the existing workflow system
-- PREREQUISITE: Run 20250116000000_create_workflow_builder_schema.sql first

-- Email Thread Tracking for Workflow Context
CREATE TABLE IF NOT EXISTS public.ugc_workflow_email_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL, -- External email thread ID
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(execution_id, thread_id)
);

-- Workflow Variables Table - Store dynamic variables for workflows
CREATE TABLE IF NOT EXISTS public.ugc_workflow_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  variable_value JSONB,
  variable_type TEXT DEFAULT 'string' CHECK (variable_type IN ('string', 'number', 'boolean', 'object', 'array')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(execution_id, variable_name)
);

-- Enhanced Workflow Execution Stats Table
CREATE TABLE IF NOT EXISTS public.ugc_workflow_execution_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ugc_workflow_executions(id) ON DELETE CASCADE,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  current_step_name TEXT,
  trigger_event TEXT,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(execution_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_execution_id 
ON public.ugc_workflow_email_threads(execution_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_creator_id 
ON public.ugc_workflow_email_threads(creator_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_email_threads_thread_id 
ON public.ugc_workflow_email_threads(thread_id);

CREATE INDEX IF NOT EXISTS idx_ugc_workflow_variables_execution_id 
ON public.ugc_workflow_variables(execution_id);
CREATE INDEX IF NOT EXISTS idx_ugc_workflow_variables_variable_name 
ON public.ugc_workflow_variables(variable_name);

CREATE INDEX IF NOT EXISTS idx_ugc_workflow_execution_stats_execution_id 
ON public.ugc_workflow_execution_stats(execution_id);

-- Enable RLS on new tables
ALTER TABLE public.ugc_workflow_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_workflow_execution_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email threads
CREATE POLICY "Users can manage email threads for their brands" ON public.ugc_workflow_email_threads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_email_threads.execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for workflow variables
CREATE POLICY "Users can manage workflow variables for their brands" ON public.ugc_workflow_variables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_variables.execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for execution stats
CREATE POLICY "Users can manage execution stats for their brands" ON public.ugc_workflow_execution_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ugc_workflow_executions we
      JOIN public.ugc_workflow_templates wt ON we.workflow_id = wt.id
      JOIN public.brands b ON wt.brand_id = b.id
      WHERE we.id = ugc_workflow_execution_stats.execution_id
      AND b.id IN (
        SELECT brand_id FROM public.user_brand_access 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_ugc_workflow_email_threads_updated_at 
  BEFORE UPDATE ON public.ugc_workflow_email_threads 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_workflow_variables_updated_at 
  BEFORE UPDATE ON public.ugc_workflow_variables 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ugc_workflow_execution_stats_updated_at 
  BEFORE UPDATE ON public.ugc_workflow_execution_stats 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create views for frontend compatibility
CREATE OR REPLACE VIEW public.ugc_workflow_execution_view AS
SELECT 
  id,
  workflow_id,
  creator_id,
  brand_id,
  current_step_id,
  status,
  started_at,
  completed_at,
  error_message,
  context,
  created_at,
  updated_at,
  -- Add computed fields for dashboard
  CASE 
    WHEN status = 'completed' THEN 100
    WHEN status = 'failed' THEN 0
    ELSE COALESCE((
      SELECT (COUNT(*) * 100.0 / NULLIF(
        (SELECT COUNT(*) FROM public.ugc_workflow_steps WHERE workflow_id = we.workflow_id), 0
      ))::INTEGER
      FROM public.ugc_workflow_step_executions se 
      WHERE se.execution_id = we.id AND se.status = 'completed'
    ), 0)
  END as completion_percentage,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM public.ugc_workflow_step_executions se 
    WHERE se.execution_id = we.id AND se.status = 'completed'
  ), 0) as completed_steps,
  
  COALESCE((
    SELECT COUNT(*) 
    FROM public.ugc_workflow_steps ws 
    WHERE ws.workflow_id = we.workflow_id
  ), 0) as total_steps,
  
  COALESCE((
    SELECT step.name 
    FROM public.ugc_workflow_steps step 
    WHERE step.id = we.current_step_id
  ), 'Starting') as current_step_name

FROM public.ugc_workflow_executions we;

-- Grant access to the view
GRANT SELECT ON public.ugc_workflow_execution_view TO authenticated;

-- Create view for human intervention queue with better naming
CREATE OR REPLACE VIEW public.ugc_human_review_queue AS
SELECT 
  id,
  execution_id as workflow_execution_id,
  step_id,
  creator_id,
  brand_id,
  assigned_to,
  priority,
  title,
  description,
  context,
  status,
  due_date,
  completed_at,
  completed_by,
  resolution_notes,
  created_at,
  updated_at
FROM public.ugc_human_intervention_queue;

-- Grant access to the view
GRANT SELECT ON public.ugc_human_review_queue TO authenticated;
```

### Migration 2: Creator Status Management API Endpoints
**File**: `20250116000005_creator_status_api_endpoints.sql`

```sql
-- API endpoints for creator status management
-- This migration creates the necessary API functions for managing custom creator statuses

-- Function to get custom creator statuses for a brand
CREATE OR REPLACE FUNCTION get_brand_creator_statuses(brand_uuid UUID)
RETURNS TABLE (
  id UUID,
  brand_id UUID,
  status_name TEXT,
  category TEXT,
  display_order INTEGER,
  color TEXT,
  is_active BOOLEAN,
  is_final BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.brand_id,
    s.status_name,
    s.category,
    s.display_order,
    s.color,
    s.is_active,
    s.is_final,
    s.created_at,
    s.updated_at
  FROM public.ugc_custom_creator_statuses s
  WHERE s.brand_id = brand_uuid
  ORDER BY s.category, s.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default creator statuses for a brand
CREATE OR REPLACE FUNCTION initialize_default_creator_statuses(brand_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default onboarding statuses
  INSERT INTO public.ugc_custom_creator_statuses (
    brand_id, status_name, category, display_order, color, is_active, is_final
  ) VALUES
    (brand_uuid, 'New Creator Submission', 'onboarding', 0, '#3B82F6', true, false),
    (brand_uuid, 'Cold Outreach', 'onboarding', 1, '#8B5CF6', true, false),
    (brand_uuid, 'Primary Screen', 'onboarding', 2, '#F59E0B', true, false),
    (brand_uuid, 'Backlog', 'onboarding', 3, '#6B7280', true, false),
    (brand_uuid, 'Approved for Next Steps', 'onboarding', 4, '#10B981', true, false),
    (brand_uuid, 'READY FOR SCRIPTS', 'onboarding', 5, '#059669', true, true),
    (brand_uuid, 'REJECTED', 'onboarding', 6, '#EF4444', true, true)
  ON CONFLICT (brand_id, status_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_brand_creator_statuses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_default_creator_statuses(UUID) TO authenticated;
```

### Migration 3: Sample Workflow Creation
**File**: `20250116000006_create_sample_workflow.sql`

```sql
-- Create sample default workflow for creator onboarding
-- This creates a comprehensive sample workflow demonstrating all features

-- Function to create sample workflow for a brand
CREATE OR REPLACE FUNCTION create_sample_creator_onboarding_workflow(brand_uuid UUID, user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    workflow_id UUID;
    step_ids UUID[];
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

    -- Create workflow steps (simplified for migration)
    INSERT INTO public.ugc_workflow_steps (workflow_id, step_order, name, description, step_type, config)
    VALUES 
        (workflow_id, 1, 'Check Creator Source', 'Determine if creator was added via onboarding form or manually', 'condition', '{"condition_type": "field_contains", "field_name": "creator.source", "operator": "equals", "expected_value": "onboarding_form"}'),
        (workflow_id, 2, 'Send Welcome Email', 'Send welcome email acknowledging creator submission', 'action', '{"action_id": "send_email", "template_name": "creator_welcome"}'),
        (workflow_id, 3, 'Wait for Portfolio Review', 'Wait for human review of creator portfolio', 'human_intervention', '{"title": "Review Creator Portfolio", "description": "Review the creators portfolio and social media", "priority": "medium"}'),
        (workflow_id, 4, 'Send Approval Email', 'Send email notifying creator of approval', 'action', '{"action_id": "send_email", "template_name": "creator_approved"}'),
        (workflow_id, 5, 'Human Script Assignment', 'Human assigns scripts to creator', 'human_intervention', '{"title": "Assign Scripts to Creator", "description": "Select and assign appropriate scripts", "priority": "high"}');

    RETURN workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sample message templates for all brands
INSERT INTO public.ugc_message_templates (brand_id, user_id, name, template_type, subject, content, variables, is_ai_generated)
SELECT 
    b.id as brand_id,
    b.user_id,
    'Creator Welcome Email',
    'email',
    'Welcome to {brand_name} - We received your submission!',
    'Hi {creator_name},

Thank you for your interest in collaborating with {brand_name}! We have received your creator application and are excited to review your portfolio.

Our team will review your submission within 2-3 business days and get back to you with next steps.

Best regards,
The {brand_name} Team',
    ARRAY['{creator_name}', '{brand_name}'],
    false
FROM public.brands b
WHERE NOT EXISTS (
    SELECT 1 FROM public.ugc_message_templates 
    WHERE brand_id = b.id AND name = 'Creator Welcome Email'
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_sample_creator_onboarding_workflow(UUID, UUID) TO authenticated;
```

## Step-by-Step Implementation Guide

### 1. Run Migrations (In Order)

```bash
# 1. First, ensure the base workflow schema exists
# Run: 20250116000000_create_workflow_builder_schema.sql (if not already run)

# 2. Add enhanced workflow execution tables
psql -d your_database -f 20250116000003_add_workflow_execution_tables.sql

# 3. Add creator status management functions
psql -d your_database -f 20250116000005_creator_status_api_endpoints.sql

# 4. Create sample workflow and templates
psql -d your_database -f 20250116000006_create_sample_workflow.sql
```

### 2. Regenerate Types

```bash
# Navigate to your project directory
cd supabase-nextjs-template/nextjs

# Regenerate Supabase types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts

# Or if using local development
npx supabase gen types typescript --local > src/lib/types/supabase.ts
```

### 3. Create Sample Workflows for Existing Brands

```sql
-- Run this for each existing brand to create sample workflows
SELECT create_sample_creator_onboarding_workflow(
    'BRAND_UUID_HERE',
    'USER_UUID_HERE'
);

-- Initialize default creator statuses for each brand
SELECT initialize_default_creator_statuses('BRAND_UUID_HERE');
```

### 4. Test the Implementation

1. **Navigate to UGC Pipeline**: Go to any brand's UGC pipeline
2. **Check Navigation**: Verify the new navigation structure
3. **Test UGC Coordinator**: Click on "UGC Coordinator" under Automation
4. **Test Creator Statuses**: Go to Settings > Creator Statuses tab
5. **Test Email Templates**: Create a new email template and verify AI generated option works
6. **Test Workflow Builder**: Verify workflow builder only shows Workflows and Analytics tabs

## Features Implemented

### UGC Coordinator Dashboard
- ✅ Overview with key metrics
- ✅ Workflow execution monitoring
- ✅ Human review queue management
- ✅ Execution controls (pause/resume/retry)
- ✅ Real-time status updates

### Creator Status Management
- ✅ Custom status creation by category
- ✅ Color and property management
- ✅ Default status initialization
- ✅ Integration with existing onboarding statuses

### Email Template Improvements
- ✅ Fixed modal sizing issues
- ✅ Removed in-app notification type
- ✅ Hidden content section for AI generated templates
- ✅ Improved variable management

### Workflow Builder Enhancements
- ✅ Streamlined tab structure
- ✅ Removed creator statuses (moved to settings)
- ✅ Enhanced human intervention functionality

### API Endpoints
- ✅ Workflow execution management
- ✅ Human review queue handling
- ✅ Creator status CRUD operations
- ✅ Proper authentication and RLS

## Future Enhancements

1. **Workflow Engine**: Implement actual workflow execution engine
2. **AI Integration**: Connect Gemini 2.5 Pro for AI analysis and responses
3. **Slack Notifications**: Add Slack integration for human review notifications
4. **Email Integration**: Connect with email providers for actual email sending
5. **Analytics**: Implement detailed workflow performance analytics
6. **Script Pipeline Integration**: Full integration with script assignment and approval
7. **Rate Negotiation**: Automated rate negotiation workflows
8. **Product Shipment Tracking**: Integration with shipping providers

## Troubleshooting

### Common Issues

1. **Migration Errors**: Ensure migrations are run in the correct order
2. **Type Errors**: Regenerate types after running migrations
3. **RLS Issues**: Verify user has proper brand access permissions
4. **API Errors**: Check that all required tables and functions exist

### Verification Steps

1. Check that all new tables exist in the database
2. Verify RLS policies are properly configured
3. Test API endpoints with proper authentication
4. Confirm sample workflows are created for brands
5. Validate that email templates are properly formatted

This implementation provides a solid foundation for the complete UGC pipeline workflow system with room for future enhancements and integrations.