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