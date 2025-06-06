import { Json } from './supabase';

// Workflow Template Types
export interface UgcWorkflowTemplate {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  trigger_event: TriggerEvent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WorkflowCategory = 
  | 'onboarding' 
  | 'script_pipeline' 
  | 'rate_negotiation' 
  | 'product_shipment' 
  | 'contract_signing' 
  | 'content_delivery';

export type TriggerEvent = 
  | 'creator_added' 
  | 'status_change' 
  | 'manual' 
  | 'time_based';

// Workflow Step Types
export interface UgcWorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  name: string;
  description?: string;
  step_type: StepType;
  config: WorkflowStepConfig;
  created_at: string;
  updated_at: string;
}

export type StepType = 'action' | 'condition' | 'wait' | 'human_intervention';

export interface WorkflowStepConfig {
  // Action-specific config
  action_id?: string;
  action_inputs?: Record<string, unknown>;
  
  // Condition-specific config
  conditions?: UgcWorkflowCondition[];
  
  // Wait-specific config
  wait_duration?: number; // in seconds
  wait_until?: string; // ISO datetime
  
  // Human intervention config
  intervention_title?: string;
  intervention_description?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // General config
  retry_on_failure?: boolean;
  retry_count?: number;
  timeout?: number; // in seconds
}

// Workflow Action Types
export interface UgcWorkflowAction {
  id: string;
  name: string;
  description?: string;
  action_type: ActionType;
  input_schema: Json;
  output_schema: Json;
  is_system: boolean;
  created_at: string;
}

export type ActionType = 
  | 'send_email' 
  | 'update_status' 
  | 'assign_script' 
  | 'schedule_call' 
  | 'send_notification' 
  | 'create_task' 
  | 'ai_generate';

// Workflow Condition Types
export interface UgcWorkflowCondition {
  id: string;
  step_id: string;
  condition_type: ConditionType;
  field_name?: string;
  operator: ConditionOperator;
  expected_value?: string;
  next_step_id?: string;
  created_at: string;
}

export type ConditionType = 
  | 'status_equals' 
  | 'field_contains' 
  | 'time_elapsed' 
  | 'response_received' 
  | 'custom_logic';

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'exists' 
  | 'not_exists';

// Workflow Execution Types
export interface UgcWorkflowExecution {
  id: string;
  workflow_id: string;
  creator_id: string;
  brand_id: string;
  current_step_id?: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  context: ExecutionContext;
  created_at: string;
  updated_at: string;
}

export type ExecutionStatus = 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'waiting_human';

export interface ExecutionContext {
  variables: Record<string, unknown>;
  step_outputs: Record<string, unknown>;
  retry_count: number;
  last_error?: string;
}

// Workflow Step Execution Types
export interface UgcWorkflowStepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  status: StepExecutionStatus;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  input_data: Json;
  output_data: Json;
  created_at: string;
  updated_at: string;
}

export type StepExecutionStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'waiting';

// Custom Creator Status Types
export interface UgcCustomCreatorStatus {
  id: string;
  brand_id: string;
  status_name: string;
  category: StatusCategory;
  display_order: number;
  color: string;
  is_active: boolean;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}

export type StatusCategory = 
  | 'onboarding' 
  | 'script_pipeline' 
  | 'negotiation' 
  | 'production' 
  | 'delivery';

// Message Template Types
export interface UgcMessageTemplate {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  template_type: MessageTemplateType;
  subject?: string;
  content: string;
  variables: string[];
  is_ai_generated: boolean;
  ai_prompt?: string;
  created_at: string;
  updated_at: string;
}

export type MessageTemplateType = 'email' | 'sms' | 'slack' | 'notification';

// Human Intervention Types
export interface UgcHumanInterventionTask {
  id: string;
  execution_id: string;
  step_id: string;
  creator_id: string;
  brand_id: string;
  assigned_to?: string;
  priority: TaskPriority;
  title: string;
  description?: string;
  context: Json;
  status: TaskStatus;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// Marketplace Types
export interface UgcMarketplaceApplication {
  id: string;
  creator_id?: string;
  email: string;
  name: string;
  phone_number?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  portfolio_link?: string;
  demographics: Json;
  content_types: string[];
  platforms: string[];
  application_data: Json;
  consent_email: boolean;
  consent_sms: boolean;
  status: ApplicationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review';

export interface UgcBrandJobPosting {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description: string;
  requirements?: string;
  compensation_range?: string;
  content_types: string[];
  target_demographics: Json;
  application_deadline?: string;
  is_active: boolean;
  slots_available?: number;
  slots_filled: number;
  created_at: string;
  updated_at: string;
}

export interface UgcJobApplication {
  id: string;
  job_id: string;
  creator_id?: string;
  marketplace_application_id?: string;
  cover_letter?: string;
  portfolio_samples: string[];
  proposed_rate?: number;
  status: JobApplicationStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export type JobApplicationStatus = 'pending' | 'shortlisted' | 'rejected' | 'accepted';

// Workflow Builder UI Types
export interface WorkflowBuilderNode {
  id: string;
  type: 'start' | 'action' | 'condition' | 'wait' | 'human_intervention' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    step?: UgcWorkflowStep;
    config?: WorkflowStepConfig;
  };
}

export interface WorkflowBuilderEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: UgcWorkflowCondition;
}

export interface WorkflowBuilderState {
  workflow: UgcWorkflowTemplate | null;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  selectedNode: WorkflowBuilderNode | null;
  selectedEdge: WorkflowBuilderEdge | null;
  isEditing: boolean;
}

// Action Input/Output Schemas
export interface SendEmailActionInput {
  template_id: string;
  variables: Record<string, unknown>;
  to_email?: string; // Override recipient
}

export interface SendEmailActionOutput {
  message_id: string;
  sent_at: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface UpdateStatusActionInput {
  new_status: string;
  reason?: string;
  notify_team?: boolean;
}

export interface UpdateStatusActionOutput {
  old_status: string;
  new_status: string;
  updated_at: string;
}

export interface AssignScriptActionInput {
  script_id: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  custom_instructions?: string;
}

export interface AssignScriptActionOutput {
  assignment_id: string;
  assigned_at: string;
  due_date?: string;
}

export interface ScheduleCallActionInput {
  calendar_link: string;
  duration: number; // in minutes
  meeting_type?: 'initial' | 'follow_up' | 'review';
  agenda?: string;
}

export interface ScheduleCallActionOutput {
  calendar_event_id: string;
  meeting_url?: string;
  scheduled_for?: string;
}

export interface AIGenerateActionInput {
  prompt: string;
  content_type: 'email' | 'script' | 'message' | 'task_description';
  context?: Record<string, unknown>;
  max_tokens?: number;
}

export interface AIGenerateActionOutput {
  generated_content: string;
  tokens_used: number;
  model_used: string;
  generated_at: string;
}

// Predefined Workflow Templates
export const DEFAULT_WORKFLOW_TEMPLATES = {
  CREATOR_ONBOARDING: {
    name: 'Creator Onboarding',
    description: 'Standard onboarding workflow for new creators',
    category: 'onboarding' as WorkflowCategory,
    trigger_event: 'creator_added' as TriggerEvent,
  },
  SCRIPT_PIPELINE: {
    name: 'Script Assignment & Review',
    description: 'Workflow for script assignment and content review',
    category: 'script_pipeline' as WorkflowCategory,
    trigger_event: 'status_change' as TriggerEvent,
  },
  RATE_NEGOTIATION: {
    name: 'Rate Negotiation',
    description: 'Automated rate negotiation with fallback to human intervention',
    category: 'rate_negotiation' as WorkflowCategory,
    trigger_event: 'manual' as TriggerEvent,
  },
} as const;

// Variable Templates for Message Substitution
export const WORKFLOW_VARIABLES = {
  CREATOR: [
    '{creator_name}',
    '{creator_email}',
    '{creator_instagram}',
    '{creator_tiktok}',
    '{creator_phone}',
    '{creator_status}',
  ],
  BRAND: [
    '{brand_name}',
    '{brand_contact}',
    '{brand_website}',
    '{brand_description}',
  ],
  SCRIPT: [
    '{script_title}',
    '{script_link}',
    '{script_due_date}',
    '{script_status}',
    '{approve_link}',
    '{reject_link}',
  ],
  SYSTEM: [
    '{current_date}',
    '{current_time}',
    '{step_name}',
    '{workflow_name}',
  ],
} as const;

export const ALL_WORKFLOW_VARIABLES = Object.values(WORKFLOW_VARIABLES).flat(); 