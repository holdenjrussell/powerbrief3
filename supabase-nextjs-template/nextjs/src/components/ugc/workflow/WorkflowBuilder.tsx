'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Play, 
  Zap, 
  GitBranch, 
  Clock, 
  User, 
  Save,
  Edit,
  AlertCircle,
  Mail,
  MessageSquare,
  Bot,
  UserCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  Copy,
  HelpCircle,
  Info
} from 'lucide-react';
import {
  UgcWorkflowTemplate,
  UgcWorkflowStep,
  UgcWorkflowAction,
  UgcMessageTemplate,
  StepType,
  ActionType,
  ALL_WORKFLOW_VARIABLES,
  StepTriggerType,
  ConditionOperator
} from '@/lib/types/ugcWorkflow';
import {
  getWorkflowActions,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  getMessageTemplates,
  updateWorkflow
} from '@/lib/services/ugcWorkflowService';
import { WorkflowCanvas } from './canvas/WorkflowCanvas';

// New: Field Group Component for organized configuration
interface FieldGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ 
  title, 
  description, 
  children, 
  collapsible = false, 
  defaultExpanded = true,
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (collapsible) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-2">
            {icon}
            <div className="text-left">
              <h4 className="font-medium text-sm">{title}</h4>
              {description && (
                <p className="text-xs text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="space-y-4 pl-4 border-l-2 border-gray-100">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 pl-6 border-l-2 border-gray-100">
        {children}
      </div>
    </div>
  );
};

// New: Field with Help Component for contextual guidance
interface FieldWithHelpProps {
  label: string;
  help?: string;
  examples?: string[];
  required?: boolean;
  children: React.ReactNode;
}

const FieldWithHelp: React.FC<FieldWithHelpProps> = ({ 
  label, 
  help, 
  examples, 
  required = false, 
  children 
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className={required ? "font-medium" : ""}>{label}</Label>
        {required && <span className="text-red-500 text-sm">*</span>}
        {help && (
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={`Show help for ${label}`}
            title={`Show help for ${label}`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
      {help && showHelp && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800">{help}</p>
              {examples && examples.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-blue-800">Examples:</p>
                  <ul className="list-disc list-inside text-blue-700 mt-1">
                    {examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// New: Smart Variable Selector Component
interface SmartVariableSelectorProps {
  availableVariables?: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SmartVariableSelector: React.FC<SmartVariableSelectorProps> = ({
  availableVariables = ALL_WORKFLOW_VARIABLES,
  value,
  onChange,
  placeholder = "Select a variable...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVariables = availableVariables.filter(variable =>
    variable.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((groups, variable) => {
    const category = variable.split('.')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(variable);
    return groups;
  }, {} as Record<string, string[]>);

  return (
    <div className="relative">
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
          </div>
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category}>
              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                {category}
              </div>
              {variables.map((variable) => (
                <SelectItem key={variable} value={variable}>
                  <span className="font-mono text-sm">{variable}</span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface WorkflowBuilderProps {
  workflow: UgcWorkflowTemplate;
  brandId: string;
  onSave?: () => void;
}

const ACTION_TYPE_ICONS: Record<ActionType, React.ReactNode> = {
  send_email: <Mail className="h-4 w-4" />,
  update_status: <UserCheck className="h-4 w-4" />,
  assign_script: <MessageSquare className="h-4 w-4" />,
  schedule_call: <Clock className="h-4 w-4" />,
  send_notification: <AlertCircle className="h-4 w-4" />,
  create_task: <User className="h-4 w-4" />,
  ai_generate: <Bot className="h-4 w-4" />
};

export default function WorkflowBuilder({ workflow, brandId, onSave }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<UgcWorkflowStep[]>([]);
  const [availableActions, setAvailableActions] = useState<UgcWorkflowAction[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<UgcMessageTemplate[]>([]);
  const [selectedStep, setSelectedStep] = useState<UgcWorkflowStep | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<UgcWorkflowStep | null>(null);
  
  // Local workflow state to track canvas layout changes
  const [localWorkflow, setLocalWorkflow] = useState<UgcWorkflowTemplate>(workflow);
  
  // New step form state
  const [newStep, setNewStep] = useState<Partial<UgcWorkflowStep>>({
    name: '',
    description: '',
    step_type: 'action',
    config: {}
  });

  // Load workflow data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [stepsData, actionsData, templatesData] = await Promise.all([
          getWorkflowSteps(workflow.id),
          getWorkflowActions(),
          getMessageTemplates(brandId)
        ]);
        
        setSteps(stepsData);
        setAvailableActions(actionsData);
        setMessageTemplates(templatesData);
      } catch (error) {
        console.error('Error loading workflow data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [workflow.id, brandId]);

  // Update local workflow when prop changes
  useEffect(() => {
    setLocalWorkflow(workflow);
  }, [workflow]);

  const handleAddStep = async () => {
    if (!newStep.name) return;

    try {
      const stepOrder = steps.length;
      const createdStep = await createWorkflowStep({
        workflow_id: workflow.id,
        step_order: stepOrder,
        name: newStep.name,
        description: newStep.description,
        step_type: newStep.step_type || 'action',
        config: newStep.config || {}
      });

      setSteps([...steps, createdStep]);
      setIsStepDialogOpen(false);
      setNewStep({
        name: '',
        description: '',
        step_type: 'action',
        config: {}
      });
    } catch (error) {
      console.error('Error creating step:', error);
    }
  };

  const handleUpdateStep = async (step?: UgcWorkflowStep) => {
    const stepToUpdate = step || editingStep;
    if (!stepToUpdate) return;

    try {
      const updatedStep = await updateWorkflowStep(stepToUpdate.id, stepToUpdate);
      setSteps(steps.map(s => s.id === updatedStep.id ? updatedStep : s));
      
      // Only clear editing state if this was called from the edit dialog
      if (!step) {
        setEditingStep(null);
        setSelectedStep(updatedStep);
      }
    } catch (error) {
      console.error('Error updating step:', error);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteWorkflowStep(stepId);
      setSteps(steps.filter(s => s.id !== stepId));
      if (selectedStep?.id === stepId) {
        setSelectedStep(null);
      }
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  // New: Step duplication functionality (Quick Win #4)
  const handleDuplicateStep = async (step: UgcWorkflowStep) => {
    try {
      const stepOrder = steps.length;
      const duplicatedStep = await createWorkflowStep({
        workflow_id: workflow.id,
        step_order: stepOrder,
        name: `${step.name} (Copy)`,
        description: step.description,
        step_type: step.step_type,
        config: { ...step.config }
      });

      setSteps([...steps, duplicatedStep]);
    } catch (error) {
      console.error('Error duplicating step:', error);
    }
  };

  // NEW: Handle workflow updates (canvas layout, etc.)
  const handleWorkflowUpdate = async (updatedWorkflow: UgcWorkflowTemplate) => {
    try {
      // Update local state immediately so UI doesn't flicker
      setLocalWorkflow(updatedWorkflow);
      
      // Save to database
      await updateWorkflow(updatedWorkflow.id, updatedWorkflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      // Revert local state on error
      setLocalWorkflow(workflow);
    }
  };

  // Enhanced renderStepConfig with organized field groups
  const renderStepConfig = (step: UgcWorkflowStep, isEditing: boolean = false) => {
    const currentStep = isEditing ? editingStep : step;
    if (!currentStep) return null;

    switch (currentStep.step_type) {
      case 'action':
        return (
          <div className="space-y-6">
            <FieldGroup 
              title="Basic Settings" 
              description="Core action configuration"
              icon={<Settings className="h-4 w-4" />}
            >
              <FieldWithHelp
                label="Action Type"
                help="Choose the type of action this step will perform"
                examples={["Send Email", "Update Creator Status", "Assign Script"]}
                required
              >
                <Select
                  value={currentStep.config.action_id || ''}
                  onValueChange={(value) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: { ...editingStep.config, action_id: value }
                      });
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActions.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        <div className="flex items-center gap-2">
                          {ACTION_TYPE_ICONS[action.action_type]}
                          <span>{action.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWithHelp>
            </FieldGroup>

            {currentStep.config.action_id === 'send_email' && (
              <FieldGroup 
                title="Email Configuration" 
                description="Email-specific settings"
                icon={<Mail className="h-4 w-4" />}
              >
                <FieldWithHelp
                  label="Email Template"
                  help="Choose from your existing email templates. These are pre-configured email layouts with your brand styling and content structure."
                  examples={["Welcome Email Template", "Creator Approval Template", "Script Assignment Template"]}
                  required
                >
                  <Select
                    value={currentStep.config.action_inputs?.template_id as string || ''}
                    onValueChange={(value) => {
                      if (isEditing && editingStep) {
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            action_inputs: {
                              ...editingStep.config.action_inputs,
                              template_id: value
                            }
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageTemplates.filter(t => t.template_type === 'email').length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
                          <p>No email templates found.</p>
                          <p className="mt-1">Create email templates in the Templates section first.</p>
                        </div>
                      ) : (
                        messageTemplates.filter(t => t.template_type === 'email').map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{template.name}</span>
                              {template.subject && (
                                <span className="text-xs text-gray-500">Subject: {template.subject}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FieldWithHelp>

                <FieldWithHelp
                  label="Recipient"
                  help="Who should receive this email"
                  examples={["{{creator.email}}", "admin@company.com"]}
                >
                  <SmartVariableSelector
                    value={currentStep.config.action_inputs?.recipient as string || ''}
                    onChange={(value) => {
                      if (isEditing && editingStep) {
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            action_inputs: {
                              ...editingStep.config.action_inputs,
                              recipient: value
                            }
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="Select recipient variable"
                  />
                </FieldWithHelp>
              </FieldGroup>
            )}

            <FieldGroup 
              title="Error Handling" 
              description="Configure how errors are handled"
              icon={<AlertCircle className="h-4 w-4" />}
              collapsible
              defaultExpanded={false}
            >
              <FieldWithHelp
                label="Retry Settings"
                help="Automatically retry this action if it fails"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">Retry on Failure</span>
                  <Switch
                    checked={currentStep.config.retry_on_failure || false}
                    onCheckedChange={(checked) => {
                      if (isEditing && editingStep) {
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            retry_on_failure: checked
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                  />
                </div>
              </FieldWithHelp>
              
              {currentStep.config.retry_on_failure && (
                <FieldWithHelp
                  label="Retry Count"
                  help="Number of times to retry before giving up"
                  examples={["3", "5", "10"]}
                >
                  <Input
                    type="number"
                    value={currentStep.config.retry_count || 3}
                    onChange={(e) => {
                      if (isEditing && editingStep) {
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            retry_count: parseInt(e.target.value)
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                    min="1"
                    max="10"
                  />
                </FieldWithHelp>
              )}

              <FieldWithHelp
                label="Timeout"
                help="Maximum time to wait for this action to complete (in seconds)"
                examples={["30", "60", "300"]}
              >
                <Input
                  type="number"
                  value={currentStep.config.timeout || ''}
                  onChange={(e) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          timeout: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="No timeout"
                />
              </FieldWithHelp>
            </FieldGroup>

            <FieldGroup 
              title="Step Triggers" 
              description="Configure when this step should execute"
              icon={<Play className="h-4 w-4" />}
              collapsible
              defaultExpanded={true}
            >
              <FieldWithHelp
                label="Trigger Type"
                help="When should this step execute? Choose immediate for standard sequential execution, or select a trigger to wait for specific events."
                examples={["Immediate - Execute right after previous step", "Email Response - Wait for creator to reply", "Status Change - Wait for status update"]}
                required
              >
                <Select
                  value={currentStep.config.trigger?.type || 'immediate'}
                  onValueChange={(value: StepTriggerType) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          trigger: {
                            type: value,
                            config: {},
                            ...(value !== 'immediate' && { timeout_duration: 86400 }) // 24 hours default
                          }
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-500" />
                        <span>Immediate</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="email_response">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span>Email Response</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="status_change">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-orange-500" />
                        <span>Status Change</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="time_delay">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span>Time Delay</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="file_upload">
                      <div className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-indigo-500" />
                        <span>File Upload</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="manual_trigger">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-red-500" />
                        <span>Manual Trigger</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="approval">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span>Approval Required</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithHelp>

              {/* Trigger-specific configuration */}
              {currentStep.config.trigger?.type === 'email_response' && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                  <FieldWithHelp
                    label="Expected Response From"
                    help="Email address that should respond (leave empty for any reply)"
                    examples={["{{creator.email}}", "specific@email.com"]}
                  >
                    <SmartVariableSelector
                      value={currentStep.config.trigger.config.email_filters?.from_email || ''}
                      onChange={(value) => {
                        if (isEditing && editingStep) {
                          setEditingStep({
                            ...editingStep,
                            config: {
                              ...editingStep.config,
                              trigger: {
                                ...editingStep.config.trigger!,
                                config: {
                                  ...editingStep.config.trigger!.config,
                                  email_filters: {
                                    ...editingStep.config.trigger!.config.email_filters,
                                    from_email: value
                                  }
                                }
                              }
                            }
                          });
                        }
                      }}
                      disabled={!isEditing}
                      placeholder="Any email address"
                    />
                  </FieldWithHelp>
                  
                  <FieldWithHelp
                    label="Subject Must Contain"
                    help="Text that must be present in the reply subject line"
                    examples={["Re:", "Approved", "Ready for review"]}
                  >
                    <Input
                      value={currentStep.config.trigger.config.email_filters?.subject_contains || ''}
                      onChange={(e) => {
                        if (isEditing && editingStep) {
                          setEditingStep({
                            ...editingStep,
                            config: {
                              ...editingStep.config,
                              trigger: {
                                ...editingStep.config.trigger!,
                                config: {
                                  ...editingStep.config.trigger!.config,
                                  email_filters: {
                                    ...editingStep.config.trigger!.config.email_filters,
                                    subject_contains: e.target.value
                                  }
                                }
                              }
                            }
                          });
                        }
                      }}
                      disabled={!isEditing}
                      placeholder="Leave empty for any subject"
                    />
                  </FieldWithHelp>
                </div>
              )}

              {currentStep.config.trigger?.type === 'status_change' && (
                <div className="space-y-4 pl-4 border-l-2 border-orange-200">
                  <FieldWithHelp
                    label="Wait for Status Change To"
                    help="Which status should trigger the next step"
                    examples={["approved", "rejected", "in_review"]}
                  >
                    <Input
                      value={currentStep.config.trigger.config.status_change?.to_status || ''}
                      onChange={(e) => {
                        if (isEditing && editingStep) {
                          setEditingStep({
                            ...editingStep,
                            config: {
                              ...editingStep.config,
                              trigger: {
                                ...editingStep.config.trigger!,
                                config: {
                                  ...editingStep.config.trigger!.config,
                                  status_change: {
                                    ...editingStep.config.trigger!.config.status_change,
                                    to_status: e.target.value
                                  }
                                }
                              }
                            }
                          });
                        }
                      }}
                      disabled={!isEditing}
                      placeholder="e.g., approved"
                    />
                  </FieldWithHelp>
                </div>
              )}

              {currentStep.config.trigger?.type === 'time_delay' && (
                <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                  <FieldWithHelp
                    label="Delay Duration (hours)"
                    help="How many hours to wait before executing this step"
                    examples={["1", "24", "72"]}
                  >
                    <Input
                      type="number"
                      value={Math.floor((currentStep.config.trigger.config.time_delay?.duration || 3600) / 3600)}
                      onChange={(e) => {
                        if (isEditing && editingStep) {
                          setEditingStep({
                            ...editingStep,
                            config: {
                              ...editingStep.config,
                              trigger: {
                                ...editingStep.config.trigger!,
                                config: {
                                  ...editingStep.config.trigger!.config,
                                  time_delay: {
                                    ...editingStep.config.trigger!.config.time_delay,
                                    duration: parseInt(e.target.value) * 3600
                                  }
                                }
                              }
                            }
                          });
                        }
                      }}
                      disabled={!isEditing}
                      min="1"
                    />
                  </FieldWithHelp>
                </div>
              )}

              {/* Timeout configuration for non-immediate triggers */}
              {currentStep.config.trigger?.type !== 'immediate' && (
                <FieldWithHelp
                  label="Timeout (hours)"
                  help="How long to wait for the trigger before giving up and continuing"
                  examples={["24", "72", "168 (1 week)"]}
                >
                  <Input
                    type="number"
                    value={Math.floor((currentStep.config.trigger?.timeout_duration || 86400) / 3600)}
                    onChange={(e) => {
                      if (isEditing && editingStep) {
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            trigger: {
                              ...editingStep.config.trigger!,
                              timeout_duration: parseInt(e.target.value) * 3600
                            }
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                    min="1"
                  />
                </FieldWithHelp>
              )}
            </FieldGroup>
          </div>
        );

      case 'wait':
        return (
          <div className="space-y-6">
            <FieldGroup 
              title="Wait Configuration" 
              description="Configure delay settings"
              icon={<Clock className="h-4 w-4" />}
            >
              <FieldWithHelp
                label="Wait Duration"
                help="How long to wait before proceeding to the next step"
                examples={["30 seconds", "5 minutes", "1 hour"]}
                required
              >
                <Input
                  type="number"
                  value={currentStep.config.wait_duration || ''}
                  onChange={(e) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          wait_duration: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="Duration in seconds"
                />
              </FieldWithHelp>
            </FieldGroup>
          </div>
        );

      case 'human_intervention':
        return (
          <div className="space-y-6">
            <FieldGroup 
              title="Intervention Details" 
              description="Human review requirements"
              icon={<User className="h-4 w-4" />}
            >
              <FieldWithHelp
                label="Intervention Title"
                help="Brief title describing what action is needed"
                examples={["Review Creator Application", "Approve Content", "Manual Assignment"]}
                required
              >
                <Input
                  value={currentStep.config.intervention_title || ''}
                  onChange={(e) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          intervention_title: e.target.value
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="What needs to be done?"
                />
              </FieldWithHelp>

              <FieldWithHelp
                label="Description"
                help="Detailed instructions for the person handling this task"
                examples={["Check creator's portfolio quality", "Verify brand alignment", "Review content guidelines"]}
              >
                <Textarea
                  value={currentStep.config.intervention_description || ''}
                  onChange={(e) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          intervention_description: e.target.value
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="Provide detailed instructions..."
                  rows={3}
                />
              </FieldWithHelp>

              <FieldWithHelp
                label="Priority"
                help="How urgent is this intervention"
                examples={["Low - can wait", "High - needs quick attention", "Urgent - immediate action required"]}
              >
                <Select
                  value={currentStep.config.priority || 'medium'}
                  onValueChange={(value) => {
                    if (isEditing && editingStep) {
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          priority: value as 'low' | 'medium' | 'high' | 'urgent'
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Urgent</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithHelp>
            </FieldGroup>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-6">
            <FieldGroup 
              title="Condition Logic" 
              description="Define when this condition is true or false"
              icon={<GitBranch className="h-4 w-4" />}
            >
              <FieldWithHelp
                label="Field to Check"
                help="Select which field/variable you want to evaluate in this condition"
                examples={["creator.status", "creator.email", "script.approval_status"]}
                required
              >
                <SmartVariableSelector
                  value={currentStep.config.conditions?.[0]?.field_name || ''}
                  onChange={(value) => {
                    if (isEditing && editingStep) {
                      const conditions = editingStep.config.conditions || [];
                      const updatedConditions = [...conditions];
                      if (updatedConditions.length === 0) {
                        updatedConditions.push({
                          id: '',
                          step_id: editingStep.id,
                          condition_type: 'field_contains',
                          field_name: value,
                          operator: 'equals',
                          expected_value: '',
                          created_at: ''
                        });
                      } else {
                        updatedConditions[0] = {
                          ...updatedConditions[0],
                          field_name: value
                        };
                      }
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          conditions: updatedConditions
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="Select field to check"
                />
              </FieldWithHelp>

              <FieldWithHelp
                label="Operator"
                help="How should the field be compared to the expected value?"
                examples={["equals - exact match", "contains - partial match", "not_equals - different value"]}
                required
              >
                <Select
                  value={currentStep.config.conditions?.[0]?.operator || 'equals'}
                  onValueChange={(value: ConditionOperator) => {
                    if (isEditing && editingStep) {
                      const conditions = editingStep.config.conditions || [];
                      const updatedConditions = [...conditions];
                      if (updatedConditions.length === 0) {
                        updatedConditions.push({
                          id: '',
                          step_id: editingStep.id,
                          condition_type: 'field_contains',
                          field_name: '',
                          operator: value,
                          expected_value: '',
                          created_at: ''
                        });
                      } else {
                        updatedConditions[0] = {
                          ...updatedConditions[0],
                          operator: value
                        };
                      }
                      setEditingStep({
                        ...editingStep,
                        config: {
                          ...editingStep.config,
                          conditions: updatedConditions
                        }
                      });
                    }
                  }}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">=</span>
                        <span>Equals</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_equals">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">≠</span>
                        <span>Not Equals</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="contains">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">⊃</span>
                        <span>Contains</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_contains">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">⊅</span>
                        <span>Not Contains</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="greater_than">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">&gt;</span>
                        <span>Greater Than</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="less_than">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">&lt;</span>
                        <span>Less Than</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="exists">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">∃</span>
                        <span>Exists (has value)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_exists">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">∄</span>
                        <span>Not Exists (empty)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithHelp>

              {/* Only show expected value field for operators that need it */}
              {currentStep.config.conditions?.[0]?.operator && 
               !['exists', 'not_exists'].includes(currentStep.config.conditions[0].operator) && (
                <FieldWithHelp
                  label="Expected Value"
                  help="What value should the field be compared against?"
                  examples={["approved", "pending", "john@example.com", "5"]}
                  required
                >
                  <Input
                    value={currentStep.config.conditions?.[0]?.expected_value || ''}
                    onChange={(e) => {
                      if (isEditing && editingStep) {
                        const conditions = editingStep.config.conditions || [];
                        const updatedConditions = [...conditions];
                        if (updatedConditions.length === 0) {
                          updatedConditions.push({
                            id: '',
                            step_id: editingStep.id,
                            condition_type: 'field_contains',
                            field_name: '',
                            operator: 'equals',
                            expected_value: e.target.value,
                            created_at: ''
                          });
                        } else {
                          updatedConditions[0] = {
                            ...updatedConditions[0],
                            expected_value: e.target.value
                          };
                        }
                        setEditingStep({
                          ...editingStep,
                          config: {
                            ...editingStep.config,
                            conditions: updatedConditions
                          }
                        });
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="Enter expected value"
                  />
                </FieldWithHelp>
              )}

              {/* Condition Preview */}
              {currentStep.config.conditions?.[0]?.field_name && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Condition Preview</h4>
                  <div className="font-mono text-sm text-blue-700 bg-white p-2 rounded border">
                    <span className="text-purple-600">{currentStep.config.conditions[0].field_name}</span>
                    {' '}
                    <span className="text-orange-600">
                      {currentStep.config.conditions[0].operator?.replace('_', ' ')}
                    </span>
                    {' '}
                    {currentStep.config.conditions[0].expected_value && (
                      <span className="text-green-600">&quot;{currentStep.config.conditions[0].expected_value}&quot;</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>TRUE → Goes to next connected step</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>FALSE → Goes to alternative path (if connected)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">How Conditions Work</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>TRUE path:</strong> Connect the green handle to the next step</li>
                  <li>• <strong>FALSE path:</strong> Connect the red handle to an alternative step</li>
                  <li>• Use variables like <code className="bg-gray-200 px-1 rounded">creator.status</code> to check current values</li>
                  <li>• Common patterns: status checks, approval gates, data validation</li>
                </ul>
              </div>
            </FieldGroup>
          </div>
        );

      default:
        return null;
    }
  };

  // Add new function for creating steps from canvas
  const handleStepCreate = async (stepData: {
    type: StepType;
    position: { x: number; y: number };
    name: string;
  }) => {
    try {
      const stepOrder = steps.length;
      const createdStep = await createWorkflowStep({
        workflow_id: workflow.id,
        step_order: stepOrder,
        name: stepData.name,
        description: '',
        step_type: stepData.type,
        config: {}
      });

      setSteps([...steps, createdStep]);
    } catch (error) {
      console.error('Error creating step from canvas:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{workflow.name}</h2>
          <p className="text-gray-600">{workflow.description}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Workflow Step</DialogTitle>
                <DialogDescription>
                  Add a new step to your workflow
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Step Name</Label>
                  <Input
                    value={newStep.name || ''}
                    onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                    placeholder="e.g., Send Welcome Email"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newStep.description || ''}
                    onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                    placeholder="Describe what this step does..."
                  />
                </div>
                <div>
                  <Label>Step Type</Label>
                  <Select
                    value={newStep.step_type}
                    onValueChange={(value) => setNewStep({ ...newStep, step_type: value as StepType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Action</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="condition">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span>Condition</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="wait">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Wait</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="human_intervention">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Human Intervention</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStep}>
                    Add Step
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6">
        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            workflow={localWorkflow}
            steps={steps}
            onStepSelect={setSelectedStep}
            onStepUpdate={handleUpdateStep}
            onStepDelete={handleDeleteStep}
            onStepDuplicate={handleDuplicateStep}
            onStepCreate={handleStepCreate}
            selectedStep={selectedStep}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        </div>

        {/* Configuration Panel */}
        {selectedStep && (
          <div className="w-96">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedStep.name}</CardTitle>
                    <CardDescription className="text-sm">
                      Configure step settings
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {editingStep ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingStep(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStep()}
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingStep(selectedStep)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {renderStepConfig(selectedStep, !!editingStep)}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 