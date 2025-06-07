import { createSPAClient } from '@/lib/supabase/client';
import {
  UgcWorkflowTemplate,
  UgcWorkflowStep,
  UgcWorkflowExecution,
  UgcWorkflowStepExecution,
  UgcWorkflowAction
} from '../types/ugcWorkflow';
import { UgcCreator } from '../types/ugcCreator';
import {
  startWorkflowExecution,
  updateWorkflowExecution,
  getWorkflowSteps,
  getWorkflowActions,
  createHumanInterventionTask,
  getMessageTemplates,
  replaceTemplateVariables
} from './ugcWorkflowService';
import { sendEmailToCreator } from './ugcEmailService';
import { updateUgcCreator } from './ugcCreatorService';
import { v4 as uuidv4 } from 'uuid';

const supabase = createSPAClient();

interface ActionInput {
  template_id?: string;
  variables?: Record<string, string>;
  new_status?: string;
  reason?: string;
  script_id?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  calendar_link?: string;
  duration?: number;
  message?: string;
  recipients?: string[];
  title?: string;
  description?: string;
  assignee?: string;
  prompt?: string;
  content_type?: string;
}

export class WorkflowExecutionEngine {
  public execution!: UgcWorkflowExecution;
  private template: UgcWorkflowTemplate;
  public steps: UgcWorkflowStep[];
  private actions: Map<string, UgcWorkflowAction>;
  private creator: UgcCreator;
  private brandId: string;

  constructor(
    template: UgcWorkflowTemplate,
    creator: UgcCreator,
    brandId: string
  ) {
    this.template = template;
    this.creator = creator;
    this.brandId = brandId;
    this.steps = [];
    this.actions = new Map();
  }

  async initialize(): Promise<void> {
    // Load workflow steps
    this.steps = await getWorkflowSteps(this.template.id);
    
    // Load available actions
    const actionsArray = await getWorkflowActions();
    actionsArray.forEach(action => {
      this.actions.set(action.id, action);
    });

    // Create execution record
    this.execution = await startWorkflowExecution(
      this.template.id,
      this.creator.id,
      this.brandId,
      {
        variables: this.getInitialVariables(),
        step_outputs: {},
        retry_count: 0
      }
    );
  }

  private getInitialVariables(): Record<string, string> {
    return {
      creator_id: this.creator.id,
      creator_name: this.creator.name,
      creator_email: this.creator.email,
      creator_instagram: this.creator.instagram_handle || '',
      creator_tiktok: this.creator.tiktok_handle || '',
      creator_phone: this.creator.phone_number || '',
      creator_status: this.creator.status || '',
      brand_id: this.brandId,
      workflow_name: this.template.name,
      current_date: new Date().toLocaleDateString(),
      current_time: new Date().toLocaleTimeString()
    };
  }

  async execute(): Promise<void> {
    try {
      // Execute steps in order
      for (const step of this.steps) {
        const stepExecution = await this.createStepExecution(step);
        
        try {
          await this.executeStep(step, stepExecution);
          
          // Update step execution as completed
          await this.updateStepExecution(stepExecution.id, {
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        } catch (error) {
          // Handle step failure
          await this.updateStepExecution(stepExecution.id, {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });

          // Check if we should retry
          if (step.config.retry_on_failure && this.execution.context.retry_count < (step.config.retry_count || 3)) {
            await this.retryStep(step, stepExecution);
          } else {
            // Fail the entire workflow
            throw error;
          }
        }

        // Update current step in execution
        await updateWorkflowExecution(this.execution.id, {
          current_step_id: step.id,
          context: this.execution.context
        });
      }

      // Mark workflow as completed
      await updateWorkflowExecution(this.execution.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    } catch (error) {
      // Mark workflow as failed
      await updateWorkflowExecution(this.execution.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  }

  private async executeStep(step: UgcWorkflowStep, stepExecution: UgcWorkflowStepExecution): Promise<void> {
    switch (step.step_type) {
      case 'action':
        await this.executeAction(step, stepExecution);
        break;
      case 'condition':
        await this.evaluateCondition(step, stepExecution);
        break;
      case 'wait':
        await this.executeWait(step, stepExecution);
        break;
      case 'human_intervention':
        await this.createHumanIntervention(step, stepExecution);
        break;
      default:
        throw new Error(`Unknown step type: ${step.step_type}`);
    }
  }

  private async executeAction(step: UgcWorkflowStep, stepExecution: UgcWorkflowStepExecution): Promise<void> {
    const actionId = step.config.action_id;
    if (!actionId) {
      throw new Error('Action ID not specified');
    }

    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    const inputs = (step.config.action_inputs || {}) as ActionInput;
    let output: Record<string, unknown> = {};

    switch (action.action_type) {
      case 'send_email':
        output = await this.executeSendEmail(inputs);
        break;
      case 'update_status':
        output = await this.executeUpdateStatus(inputs);
        break;
      case 'assign_script':
        output = await this.executeAssignScript(inputs);
        break;
      case 'schedule_call':
        output = await this.executeScheduleCall(inputs);
        break;
      case 'send_notification':
        output = await this.executeSendNotification(inputs);
        break;
      case 'create_task':
        output = await this.executeCreateTask(inputs);
        break;
      case 'ai_generate':
        output = await this.executeAIGenerate(inputs);
        break;
      default:
        throw new Error(`Unknown action type: ${action.action_type}`);
    }

    // Store output in execution context
    this.execution.context.step_outputs[step.id] = output;
    
    // Update step execution with output
    await this.updateStepExecution(stepExecution.id, {
      output_data: output as any
    });
  }

  private async executeSendEmail(inputs: ActionInput): Promise<Record<string, unknown>> {
    const templateId = inputs.template_id;
    if (!templateId) {
      throw new Error('Email template ID not specified');
    }

    // Get the message template
    const templates = await getMessageTemplates(this.brandId);
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Email template not found: ${templateId}`);
    }

    // Replace variables in template
    const variables = {
      ...this.execution.context.variables,
      ...(inputs.variables || {})
    } as Record<string, string>;

    const subject = template.subject ? replaceTemplateVariables(template.subject, variables) : '';
    const content = replaceTemplateVariables(template.content, variables);

    // Send email using existing email service
    const result = await sendEmailToCreator(
      this.creator.id,
      this.brandId,
      subject,
      content,
      'workflow' // source
    );

    return {
      message_id: result.id,
      sent_at: new Date().toISOString(),
      status: 'sent'
    };
  }

  private async executeUpdateStatus(inputs: ActionInput): Promise<Record<string, unknown>> {
    const newStatus = inputs.new_status;
    if (!newStatus) {
      throw new Error('New status not specified');
    }

    const oldStatus = this.creator.status;

    // Update creator status
    await updateUgcCreator({
      id: this.creator.id,
      status: newStatus
    });

    // Update local creator object
    this.creator.status = newStatus;

    return {
      old_status: oldStatus,
      new_status: newStatus,
      updated_at: new Date().toISOString()
    };
  }

  private async executeAssignScript(inputs: ActionInput): Promise<Record<string, unknown>> {
    // TODO: Implement script assignment logic
    return {
      assignment_id: uuidv4(),
      assigned_at: new Date().toISOString()
    };
  }

  private async executeScheduleCall(inputs: ActionInput): Promise<Record<string, unknown>> {
    // TODO: Implement calendar integration
    return {
      calendar_event_id: uuidv4(),
      meeting_url: inputs.calendar_link,
      scheduled_for: new Date().toISOString()
    };
  }

  private async executeSendNotification(inputs: ActionInput): Promise<Record<string, unknown>> {
    // TODO: Implement in-app notification system
    return {
      notification_id: uuidv4(),
      sent_at: new Date().toISOString()
    };
  }

  private async executeCreateTask(inputs: ActionInput): Promise<Record<string, unknown>> {
    // Create a task in the human intervention queue
    const task = await createHumanInterventionTask({
      execution_id: this.execution.id,
      step_id: this.execution.current_step_id || '',
      creator_id: this.creator.id,
      brand_id: this.brandId,
      priority: inputs.priority || 'medium',
      title: inputs.title || 'Task created by workflow',
      description: inputs.description,
      context: this.execution.context as any,
      status: 'pending'
    });

    return {
      task_id: task.id,
      created_at: task.created_at
    };
  }

  private async executeAIGenerate(inputs: ActionInput): Promise<Record<string, unknown>> {
    // TODO: Implement AI content generation
    return {
      generated_content: 'AI generated content placeholder',
      tokens_used: 0,
      model_used: 'gpt-4',
      generated_at: new Date().toISOString()
    };
  }

  private async evaluateCondition(step: UgcWorkflowStep, stepExecution: UgcWorkflowStepExecution): Promise<void> {
    // TODO: Implement condition evaluation logic
    // For now, just continue to next step
  }

  private async executeWait(step: UgcWorkflowStep, stepExecution: UgcWorkflowStepExecution): Promise<void> {
    const waitDuration = step.config.wait_duration;
    if (!waitDuration) {
      throw new Error('Wait duration not specified');
    }

    // In a real implementation, this would schedule a job to resume execution
    // For now, we'll just mark it as waiting
    await updateWorkflowExecution(this.execution.id, {
      status: 'paused'
    });

    // TODO: Implement job scheduling to resume after wait period
  }

  private async createHumanIntervention(step: UgcWorkflowStep, stepExecution: UgcWorkflowStepExecution): Promise<void> {
    // Create human intervention task
    await createHumanInterventionTask({
      execution_id: this.execution.id,
      step_id: step.id,
      creator_id: this.creator.id,
      brand_id: this.brandId,
      priority: step.config.priority || 'medium',
      title: step.config.intervention_title || step.name,
      description: step.config.intervention_description,
      context: this.execution.context as any,
      status: 'pending',
      assigned_to: step.config.assignee
    });

    // Pause workflow execution
    await updateWorkflowExecution(this.execution.id, {
      status: 'waiting_human'
    });
  }

  private async createStepExecution(step: UgcWorkflowStep): Promise<UgcWorkflowStepExecution> {
    const { data, error } = await supabase
      .from('ugc_workflow_step_executions')
      .insert({
        id: uuidv4(),
        execution_id: this.execution.id,
        step_id: step.id,
        status: 'running',
        started_at: new Date().toISOString(),
        input_data: step.config as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  private async updateStepExecution(
    stepExecutionId: string,
    updates: Partial<UgcWorkflowStepExecution>
  ): Promise<void> {
    const { error } = await supabase
      .from('ugc_workflow_step_executions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', stepExecutionId);

    if (error) {
      throw error;
    }
  }

  private async retryStep(step: UgcWorkflowStep, failedExecution: UgcWorkflowStepExecution): Promise<void> {
    // Increment retry count
    this.execution.context.retry_count++;
    
    // Wait before retry (exponential backoff)
    const waitTime = Math.pow(2, this.execution.context.retry_count) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Create new step execution for retry
    const retryExecution = await this.createStepExecution(step);
    
    try {
      await this.executeStep(step, retryExecution);
      
      // Update step execution as completed
      await this.updateStepExecution(retryExecution.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
      // Reset retry count on success
      this.execution.context.retry_count = 0;
    } catch (error) {
      // Update retry execution as failed
      await this.updateStepExecution(retryExecution.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      
      throw error;
    }
  }
}

// Workflow trigger functions
export async function triggerWorkflowForCreator(
  creatorId: string,
  brandId: string,
  triggerEvent: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  // Find workflows that match the trigger event
  const { data: workflows } = await supabase
    .from('ugc_workflow_templates')
    .select('*')
    .eq('brand_id', brandId)
    .eq('trigger_event', triggerEvent)
    .eq('is_active', true);

  if (!workflows || workflows.length === 0) {
    return;
  }

  // Get creator details
  const { data: creator } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('id', creatorId)
    .single();

  if (!creator) {
    throw new Error('Creator not found');
  }

  // Execute each matching workflow
  for (const workflow of workflows) {
    try {
      const engine = new WorkflowExecutionEngine(workflow, creator, brandId);
      await engine.initialize();
      
      // Add additional context if provided
      if (additionalContext) {
        engine.execution.context.variables = {
          ...engine.execution.context.variables,
          ...additionalContext
        };
      }
      
      // Execute workflow asynchronously
      engine.execute().catch(error => {
        console.error(`Workflow execution failed for ${workflow.name}:`, error);
      });
    } catch (error) {
      console.error(`Failed to initialize workflow ${workflow.name}:`, error);
    }
  }
}

// Resume paused workflow execution
export async function resumeWorkflowExecution(executionId: string): Promise<void> {
  // Get execution details
  const { data: execution } = await supabase
    .from('ugc_workflow_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (!execution) {
    throw new Error('Execution not found');
  }

  // Get workflow template
  const { data: template } = await supabase
    .from('ugc_workflow_templates')
    .select('*')
    .eq('id', execution.workflow_id)
    .single();

  if (!template) {
    throw new Error('Workflow template not found');
  }

  // Get creator
  const { data: creator } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('id', execution.creator_id)
    .single();

  if (!creator) {
    throw new Error('Creator not found');
  }

  // Create engine and resume execution
  const engine = new WorkflowExecutionEngine(template, creator, execution.brand_id);
  engine.execution = execution;
  
  // Load remaining steps
  const allSteps = await getWorkflowSteps(template.id);
  const currentStepIndex = allSteps.findIndex(s => s.id === execution.current_step_id);
  engine.steps = allSteps.slice(currentStepIndex + 1);

  // Resume execution
  await engine.execute();
} 