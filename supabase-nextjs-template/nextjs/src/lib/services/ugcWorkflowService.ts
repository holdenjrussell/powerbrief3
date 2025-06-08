import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import {
  UgcWorkflowTemplate,
  UgcWorkflowStep,
  UgcWorkflowAction,
  UgcWorkflowExecution,
  UgcCustomCreatorStatus,
  UgcMessageTemplate,
  UgcHumanInterventionTask,
  UgcOnboardingFormConfig,
  UgcFormSubmission,
  ExecutionContext
} from '../types/ugcWorkflow';
import { UgcCreator } from '@/lib/types/ugcCreator';

const supabase = createSPAClient();

// Workflow Template Services
export async function getWorkflowTemplates(brandId: string): Promise<UgcWorkflowTemplate[]> {
  const { data, error } = await supabase
    .from('ugc_workflow_templates')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflow templates:', error);
    throw error;
  }

  return data || [];
}

export async function getWorkflowTemplateById(templateId: string): Promise<UgcWorkflowTemplate | null> {
  const { data, error } = await supabase
    .from('ugc_workflow_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Error fetching workflow template:', error);
    throw error;
  }

  return data;
}

export async function createWorkflowTemplate(
  template: Omit<UgcWorkflowTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<UgcWorkflowTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('ugc_workflow_templates')
    .insert({
      ...template,
      user_id: user.id,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow template:', error);
    throw error;
  }

  return data;
}

export async function updateWorkflowTemplate(
  templateId: string,
  updates: Partial<UgcWorkflowTemplate>
): Promise<UgcWorkflowTemplate> {
  const { data, error } = await supabase
    .from('ugc_workflow_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow template:', error);
    throw error;
  }

  return data;
}

export async function deleteWorkflowTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_workflow_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting workflow template:', error);
    throw error;
  }
}

// Workflow Step Services
export async function getWorkflowSteps(workflowId: string): Promise<UgcWorkflowStep[]> {
  const { data, error } = await supabase
    .from('ugc_workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('step_order', { ascending: true });

  if (error) {
    console.error('Error fetching workflow steps:', error);
    throw error;
  }

  return data || [];
}

export async function createWorkflowStep(
  step: Omit<UgcWorkflowStep, 'id' | 'created_at' | 'updated_at'>
): Promise<UgcWorkflowStep> {
  const { data, error } = await supabase
    .from('ugc_workflow_steps')
    .insert({
      ...step,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow step:', error);
    throw error;
  }

  return data;
}

export async function updateWorkflowStep(
  stepId: string,
  updates: Partial<UgcWorkflowStep>
): Promise<UgcWorkflowStep> {
  const { data, error } = await supabase
    .from('ugc_workflow_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow step:', error);
    throw error;
  }

  return data;
}

export async function deleteWorkflowStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_workflow_steps')
    .delete()
    .eq('id', stepId);

  if (error) {
    console.error('Error deleting workflow step:', error);
    throw error;
  }
}

export async function reorderWorkflowSteps(
  workflowId: string,
  stepOrders: { stepId: string; order: number }[]
): Promise<void> {
  const updates = stepOrders.map(({ stepId, order }) => 
    supabase
      .from('ugc_workflow_steps')
      .update({ step_order: order, updated_at: new Date().toISOString() })
      .eq('id', stepId)
      .eq('workflow_id', workflowId)
  );

  await Promise.all(updates);
}

// Workflow Action Services
export async function getWorkflowActions(): Promise<UgcWorkflowAction[]> {
  const { data, error } = await supabase
    .from('ugc_workflow_actions')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching workflow actions:', error);
    throw error;
  }

  return data || [];
}

// Custom Creator Status Services
export async function getCustomCreatorStatuses(brandId: string): Promise<UgcCustomCreatorStatus[]> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .select('*')
    .eq('brand_id', brandId)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching custom creator statuses:', error);
    throw error;
  }

  return data || [];
}

export async function createCustomCreatorStatus(
  status: Omit<UgcCustomCreatorStatus, 'id' | 'created_at' | 'updated_at'>
): Promise<UgcCustomCreatorStatus> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .insert({
      ...status,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom creator status:', error);
    throw error;
  }

  return data;
}

export async function updateCustomCreatorStatus(
  statusId: string,
  updates: Partial<UgcCustomCreatorStatus>
): Promise<UgcCustomCreatorStatus> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', statusId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom creator status:', error);
    throw error;
  }

  return data;
}

export async function deleteCustomCreatorStatus(statusId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_custom_creator_statuses')
    .delete()
    .eq('id', statusId);

  if (error) {
    console.error('Error deleting custom creator status:', error);
    throw error;
  }
}

// Message Template Services
export async function getMessageTemplates(brandId: string): Promise<UgcMessageTemplate[]> {
  const { data, error } = await supabase
    .from('ugc_message_templates')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching message templates:', error);
    throw error;
  }

  return data || [];
}

export async function createMessageTemplate(
  template: Omit<UgcMessageTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<UgcMessageTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('ugc_message_templates')
    .insert({
      ...template,
      user_id: user.id,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating message template:', error);
    throw error;
  }

  return data;
}

export async function updateMessageTemplate(
  templateId: string,
  updates: Partial<UgcMessageTemplate>
): Promise<UgcMessageTemplate> {
  const { data, error } = await supabase
    .from('ugc_message_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Error updating message template:', error);
    throw error;
  }

  return data;
}

export async function deleteMessageTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_message_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting message template:', error);
    throw error;
  }
}

// Workflow Execution Services
export async function startWorkflowExecution(
  workflowId: string,
  creatorId: string,
  brandId: string,
  initialContext?: Partial<ExecutionContext>
): Promise<UgcWorkflowExecution> {
  const { data, error } = await supabase
    .from('ugc_workflow_executions')
    .insert({
      id: uuidv4(),
      workflow_id: workflowId,
      creator_id: creatorId,
      brand_id: brandId,
      status: 'running',
      started_at: new Date().toISOString(),
      context: {
        variables: {},
        step_outputs: {},
        retry_count: 0,
        ...initialContext
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting workflow execution:', error);
    throw error;
  }

  return data;
}

export async function getWorkflowExecutions(
  brandId: string,
  filters?: {
    creatorId?: string;
    workflowId?: string;
    status?: string;
  }
): Promise<UgcWorkflowExecution[]> {
  let query = supabase
    .from('ugc_workflow_executions')
    .select('*')
    .eq('brand_id', brandId);

  if (filters?.creatorId) {
    query = query.eq('creator_id', filters.creatorId);
  }
  if (filters?.workflowId) {
    query = query.eq('workflow_id', filters.workflowId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching workflow executions:', error);
    throw error;
  }

  return data || [];
}

export async function updateWorkflowExecution(
  executionId: string,
  updates: Partial<UgcWorkflowExecution>
): Promise<UgcWorkflowExecution> {
  const { data, error } = await supabase
    .from('ugc_workflow_executions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', executionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow execution:', error);
    throw error;
  }

  return data;
}

// Human Intervention Services
export async function getHumanInterventionTasks(
  brandId: string,
  filters?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
  }
): Promise<UgcHumanInterventionTask[]> {
  let query = supabase
    .from('ugc_human_intervention_queue')
    .select('*')
    .eq('brand_id', brandId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching human intervention tasks:', error);
    throw error;
  }

  return data || [];
}

export async function createHumanInterventionTask(
  task: Omit<UgcHumanInterventionTask, 'id' | 'created_at' | 'updated_at'>
): Promise<UgcHumanInterventionTask> {
  const { data, error } = await supabase
    .from('ugc_human_intervention_queue')
    .insert({
      ...task,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating human intervention task:', error);
    throw error;
  }

  return data;
}

export async function completeHumanInterventionTask(
  taskId: string,
  completedBy: string,
  resolutionNotes?: string
): Promise<UgcHumanInterventionTask> {
  const { data, error } = await supabase
    .from('ugc_human_intervention_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
      resolution_notes: resolutionNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error completing human intervention task:', error);
    throw error;
  }

  return data;
}

// Onboarding Form Services
export async function getOnboardingFormConfig(brandId: string): Promise<UgcOnboardingFormConfig | null> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching onboarding form config:', error);
    throw error;
  }

  // If no config exists, create a default one
  if (!data) {
    try {
      const defaultConfig = {
        brand_id: brandId,
        form_name: 'Creator Application',
        description: 'Join our creator community and start creating amazing content!',
        welcome_message: 'Welcome! We\'re excited to learn more about you and your content creation journey.',
        success_message: 'Thank you for your application! We will review it and get back to you soon.',
        is_public: true,
        is_active: true,
        requires_approval: true,
        auto_assign_status: 'New Creator Submission',
        collect_demographics: true,
        collect_social_handles: true,
        collect_address: true,
        collect_portfolio: true,
        custom_fields: [],
        branding: {},
        notification_emails: []
      };

      const { data: newConfig, error: createError } = await supabase
        .from('ugc_onboarding_form_configs')
        .insert(defaultConfig)
        .select()
        .single();

      if (createError) {
        console.error('Error creating default onboarding form config:', createError);
        return null;
      }

      return newConfig;
    } catch (error) {
      console.error('Error creating default form config:', error);
      return null;
    }
  }

  return data;
}

export async function createOnboardingFormConfig(
  config: Omit<UgcOnboardingFormConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<UgcOnboardingFormConfig> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .insert({
      ...config,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating onboarding form config:', error);
    throw error;
  }

  return data;
}

export async function updateOnboardingFormConfig(
  configId: string,
  updates: Partial<UgcOnboardingFormConfig>
): Promise<UgcOnboardingFormConfig> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', configId)
    .select()
    .single();

  if (error) {
    console.error('Error updating onboarding form config:', error);
    throw error;
  }

  return data;
}

// Form Submission Services
export async function getFormSubmissions(
  brandId: string,
  filters?: {
    status?: string;
    formConfigId?: string;
  }
): Promise<UgcFormSubmission[]> {
  let query = supabase
    .from('ugc_form_submissions')
    .select('*')
    .eq('brand_id', brandId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.formConfigId) {
    query = query.eq('form_config_id', filters.formConfigId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching form submissions:', error);
    throw error;
  }

  return data || [];
}

export async function createFormSubmission(
  submission: Omit<UgcFormSubmission, 'id' | 'created_at' | 'updated_at'>
): Promise<{ submission: UgcFormSubmission; creator?: UgcCreator; message: string }> {
  try {
    const response = await fetch('/api/ugc/onboarding/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit form');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting form:', error);
    throw error;
  }
}

export async function approveFormSubmission(
  submissionId: string,
  reviewedBy: string,
  reviewNotes?: string
): Promise<UgcFormSubmission> {
  const { data, error } = await supabase
    .from('ugc_form_submissions')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) {
    console.error('Error approving form submission:', error);
    throw error;
  }

  return data;
}

export async function rejectFormSubmission(
  submissionId: string,
  reviewedBy: string,
  reviewNotes?: string
): Promise<UgcFormSubmission> {
  const { data, error } = await supabase
    .from('ugc_form_submissions')
    .update({
      status: 'rejected',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting form submission:', error);
    throw error;
  }

  return data;
}

// Helper function to replace variables in templates
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

// Helper function to extract variables from template
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

export async function updateWorkflow(
  workflowId: string, 
  updates: Partial<UgcWorkflowTemplate>
): Promise<UgcWorkflowTemplate> {
  const { data, error } = await supabase
    .from('ugc_workflow_templates')
    .update(updates)
    .eq('id', workflowId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow:', error);
    throw error;
  }

  return data;
}

export async function createDefaultWorkflowForBrand(brandId: string): Promise<UgcWorkflowTemplate> {
  const supabase = createSPAClient();

  // Create the default workflow template
  const { data: workflow, error: workflowError } = await supabase
    .from('ugc_workflow_templates')
    .insert({
      brand_id: brandId,
      name: 'Complete Creator Onboarding & Script Pipeline',
      description: 'Default workflow that handles creator onboarding from submission to content delivery, including script assignment and approval processes.',
      category: 'onboarding',
      trigger_event: 'creator_added',
      is_active: true,
      canvas_data: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    })
    .select()
    .single();

  if (workflowError) {
    throw workflowError;
  }

  // Create the workflow steps
  const steps = [
    {
      workflow_id: workflow.id,
      step_order: 0,
      name: 'Creator Added',
      description: 'Workflow triggered when a new creator is added',
      step_type: 'trigger' as StepType,
      config: {
        trigger_type: 'creator_added',
        conditions: []
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 1,
      name: 'Check Onboarding Source',
      description: 'Determine if creator was added via onboarding form or manually',
      step_type: 'condition' as StepType,
      config: {
        condition_type: 'creator_source',
        operator: 'equals' as ConditionOperator,
        value: 'onboarding_form',
        true_path: 2,
        false_path: 3
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 2,
      name: 'Send Welcome Email',
      description: 'Send welcome email to creators from onboarding form',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'welcome_onboarding',
          variables: {
            creator_name: '{creator.name}',
            brand_name: '{brand.name}'
          }
        },
        next_step: 4
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 3,
      name: 'Check Email Availability',
      description: 'Check if manually added creator has email',
      step_type: 'condition' as StepType,
      config: {
        condition_type: 'field_exists',
        field: 'creator.email',
        true_path: 5,
        false_path: 6
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 4,
      name: 'Update Status to Cold Outreach',
      description: 'Move creator to cold outreach status',
      step_type: 'action' as StepType,
      config: {
        action_id: 'update_status',
        action_inputs: {
          new_status: 'Cold Outreach',
          reason: 'Automated workflow progression'
        },
        next_step: 7
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 5,
      name: 'Send Onboarding Form Email',
      description: 'Send email with prefilled onboarding form to manually added creator',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'onboarding_form_request',
          variables: {
            creator_name: '{creator.name}',
            onboarding_link: '{brand.onboarding_url}?prefill={creator.id}'
          }
        },
        next_step: 4
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 6,
      name: 'Human Review - Missing Email',
      description: 'Require human intervention to collect creator email',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'missing_email',
        title: 'Creator Missing Email Address',
        description: 'Creator {creator.name} was added without an email address. Please collect their contact information to proceed.',
        priority: 'high',
        required_fields: ['email'],
        actions: [
          { id: 'add_email', label: 'Add Email & Continue', action_type: 'update_creator' },
          { id: 'skip', label: 'Skip for Now', action_type: 'defer' }
        ]
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 7,
      name: 'Wait for Human Review',
      description: 'Wait for human to review creator portfolio and move to primary screen',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'creator_approval',
        title: 'Creator Portfolio Review',
        description: 'Review {creator.name}\'s portfolio and social media. Move to Primary Screen if suitable.',
        priority: 'medium',
        actions: [
          { id: 'approve_primary', label: 'Move to Primary Screen', action_type: 'update_status', data: { status: 'Primary Screen' } },
          { id: 'reject', label: 'Reject Creator', action_type: 'update_status', data: { status: 'REJECTED' } },
          { id: 'backlog', label: 'Move to Backlog', action_type: 'update_status', data: { status: 'Backlog' } }
        ]
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 8,
      name: 'Wait for Final Approval',
      description: 'Wait for human to approve creator for next steps',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'creator_approval',
        title: 'Final Creator Approval',
        description: 'Approve {creator.name} for script assignments and rate negotiations.',
        priority: 'medium',
        actions: [
          { id: 'approve_next_steps', label: 'Approve for Next Steps', action_type: 'update_status', data: { status: 'Approved for Next Steps' } },
          { id: 'schedule_call', label: 'Schedule Call First', action_type: 'update_status', data: { status: 'Schedule Call' } }
        ]
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 9,
      name: 'Send Approval Email',
      description: 'Send email confirming creator approval',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'creator_approved',
          variables: {
            creator_name: '{creator.name}',
            brand_name: '{brand.name}'
          }
        },
        next_step: 10
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 10,
      name: 'AI Response Analysis',
      description: 'Use Gemini 2.5 Pro to analyze creator responses and determine next actions',
      step_type: 'ai_analysis' as StepType,
      config: {
        ai_model: 'gemini-2.5-pro',
        analysis_type: 'email_response',
        available_actions: ['rate_negotiation', 'script_request', 'general_inquiry'],
        prompt: 'Analyze the creator\'s email response and determine the appropriate next action. Consider if they are asking about rates, requesting to see scripts, or have other questions.',
        next_step_mapping: {
          rate_negotiation: 11,
          script_request: 12,
          general_inquiry: 13
        }
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 11,
      name: 'AI Rate Negotiation',
      description: 'Engage in automated rate negotiation with creator',
      step_type: 'ai_action' as StepType,
      config: {
        ai_model: 'gemini-2.5-pro',
        action_type: 'rate_negotiation',
        max_iterations: 3,
        escalation_conditions: ['rate_too_high', 'negotiation_stalled'],
        escalation_step: 14
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 12,
      name: 'Send Script Examples',
      description: 'Send example scripts to creator for review',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'script_examples',
          variables: {
            creator_name: '{creator.name}',
            script_examples: '{brand.sample_scripts}'
          }
        },
        next_step: 15
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 13,
      name: 'AI General Response',
      description: 'AI handles general inquiries and questions',
      step_type: 'ai_action' as StepType,
      config: {
        ai_model: 'gemini-2.5-pro',
        action_type: 'general_response',
        escalation_conditions: ['complex_question', 'complaint'],
        escalation_step: 14
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 14,
      name: 'Human Intervention - Complex Issue',
      description: 'Human review required for complex negotiations or issues',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'rate_negotiation',
        title: 'Complex Rate Negotiation',
        description: 'Creator {creator.name} requires human intervention for rate negotiation or complex inquiry.',
        priority: 'high',
        actions: [
          { id: 'manual_negotiate', label: 'Handle Manually', action_type: 'manual_takeover' },
          { id: 'set_final_rate', label: 'Set Final Rate', action_type: 'finalize_rate' }
        ]
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 15,
      name: 'Human Script Assignment',
      description: 'Human assigns specific scripts to creator',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'script_assignment',
        title: 'Assign Scripts to Creator',
        description: 'Assign one or more scripts to {creator.name} and finalize rates.',
        priority: 'medium',
        actions: [
          { id: 'assign_scripts', label: 'Assign Scripts', action_type: 'script_assignment' },
          { id: 'defer', label: 'Defer Assignment', action_type: 'defer' }
        ],
        next_step: 16
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 16,
      name: 'AI Script Assignment Email',
      description: 'AI drafts email with assigned scripts and context',
      step_type: 'ai_action' as StepType,
      config: {
        ai_model: 'gemini-2.5-pro',
        action_type: 'script_assignment_email',
        context_includes: ['conversation_history', 'assigned_scripts', 'finalized_rates'],
        next_step: 17
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 17,
      name: 'Check Contract Status',
      description: 'Verify if contract is signed',
      step_type: 'condition' as StepType,
      config: {
        condition_type: 'field_equals',
        field: 'creator.contract_status',
        operator: 'equals' as ConditionOperator,
        value: 'contract signed',
        true_path: 18,
        false_path: 19
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 18,
      name: 'Check Product Shipment',
      description: 'Verify if product has been shipped',
      step_type: 'condition' as StepType,
      config: {
        condition_type: 'field_equals',
        field: 'creator.product_shipped',
        operator: 'equals' as ConditionOperator,
        value: true,
        true_path: 20,
        false_path: 21
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 19,
      name: 'Human Action - Send Contract',
      description: 'Human needs to send contract to creator',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'contract_signing',
        title: 'Send Contract to Creator',
        description: 'Creator {creator.name} needs to sign contract before proceeding.',
        priority: 'high',
        actions: [
          { id: 'send_contract', label: 'Send Contract', action_type: 'send_contract' },
          { id: 'skip_contract', label: 'Skip for Now', action_type: 'defer' }
        ],
        next_step: 17
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 20,
      name: 'Notify Creator - Ready to Shoot',
      description: 'Inform creator they can begin shooting',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'ready_to_shoot',
          variables: {
            creator_name: '{creator.name}',
            submission_deadline: '{script.deadline}',
            content_guidelines: '{brand.content_guidelines}'
          }
        },
        next_step: 22
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 21,
      name: 'Human Action - Ship Product',
      description: 'Human needs to ship product to creator',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'product_shipment',
        title: 'Ship Product to Creator',
        description: 'Ship product to {creator.name} and update shipment status.',
        priority: 'high',
        actions: [
          { id: 'ship_product', label: 'Mark as Shipped', action_type: 'update_shipment' },
          { id: 'request_address', label: 'Request Address', action_type: 'request_address' }
        ],
        next_step: 18
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 22,
      name: 'Wait for Content Submission',
      description: 'Wait for creator to submit content',
      step_type: 'wait' as StepType,
      config: {
        wait_type: 'content_submission',
        timeout_days: 7,
        timeout_action: 'send_reminder',
        next_step: 23
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 23,
      name: 'Send Content Received Email',
      description: 'Confirm content receipt and review timeline',
      step_type: 'action' as StepType,
      config: {
        action_id: 'send_email',
        action_inputs: {
          template_id: 'content_received',
          variables: {
            creator_name: '{creator.name}',
            review_timeline: '2-3 business days'
          }
        },
        next_step: 24
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 24,
      name: 'Human Content Review',
      description: 'Human reviews submitted content',
      step_type: 'human_intervention' as StepType,
      config: {
        intervention_type: 'content_review',
        title: 'Review Submitted Content',
        description: 'Review content submitted by {creator.name} and provide feedback or approval.',
        priority: 'medium',
        actions: [
          { id: 'approve_content', label: 'Approve Content', action_type: 'approve_content' },
          { id: 'request_revision', label: 'Request Revision', action_type: 'request_revision' },
          { id: 'reject_content', label: 'Reject Content', action_type: 'reject_content' }
        ],
        next_step: 25
      }
    },
    {
      workflow_id: workflow.id,
      step_order: 25,
      name: 'Move to Edit',
      description: 'Move approved content to editing phase',
      step_type: 'action' as StepType,
      config: {
        action_id: 'update_status',
        action_inputs: {
          new_status: 'To Edit',
          script_status: 'COMPLETED'
        }
      }
    }
  ];

  // Insert all steps
  const { error: stepsError } = await supabase
    .from('ugc_workflow_steps')
    .insert(steps);

  if (stepsError) {
    throw stepsError;
  }

  return workflow;
} 