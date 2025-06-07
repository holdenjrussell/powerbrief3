'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Play, 
  Pause, 
  Zap, 
  GitBranch, 
  Clock, 
  User, 
  Save,
  Trash2,
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
  Info,
  List,
  Network
} from 'lucide-react';
import {
  UgcWorkflowTemplate,
  UgcWorkflowStep,
  UgcWorkflowAction,
  UgcMessageTemplate,
  StepType,
  ActionType,
  ALL_WORKFLOW_VARIABLES
} from '@/lib/types/ugcWorkflow';
import {
  getWorkflowActions,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  getMessageTemplates
} from '@/lib/services/ugcWorkflowService';

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

const STEP_TYPE_ICONS: Record<StepType, React.ReactNode> = {
  action: <Zap className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  human_intervention: <User className="h-4 w-4" />
};

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
  
  // New state for view mode toggle
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>('list');

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

  const handleUpdateStep = async () => {
    if (!editingStep) return;

    try {
      const updatedStep = await updateWorkflowStep(editingStep.id, editingStep);
      setSteps(steps.map(s => s.id === updatedStep.id ? updatedStep : s));
      setEditingStep(null);
      setSelectedStep(updatedStep);
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
                  help="Choose a pre-configured email template or create a custom message"
                  examples={["Welcome Email", "Status Update", "Reminder"]}
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
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {messageTemplates.filter(t => t.template_type === 'email').map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
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
              description="Define branching logic"
              icon={<GitBranch className="h-4 w-4" />}
            >
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Coming Soon</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Advanced condition builder with visual logic editor is under development.
                </p>
              </div>
            </FieldGroup>
          </div>
        );

      default:
        return null;
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
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mr-4">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'canvas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('canvas')}
            >
              <Network className="h-4 w-4 mr-2" />
              Canvas
            </Button>
          </div>

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
        {/* Steps List */}
        <div className="w-96">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>
                Drag to reorder, click to configure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-2">
                  {/* Start Node */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Start: {workflow.trigger_event}</span>
                  </div>

                  {/* Steps */}
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStep?.id === step.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          {STEP_TYPE_ICONS[step.step_type]}
                          <div>
                            <div className="font-medium">{step.name}</div>
                            {step.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {step.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateStep(step);
                            }}
                            title="Duplicate step"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(step.id);
                            }}
                            title="Delete step"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* End Node */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <Pause className="h-5 w-5 text-red-600" />
                    <span className="font-medium">End: Workflow Complete</span>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Step Configuration */}
        <div className="flex-1">
          {selectedStep ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedStep.name}</CardTitle>
                    <CardDescription>
                      Configure step settings and parameters
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
                          onClick={handleUpdateStep}
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
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="config">
                  <TabsList>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="config" className="space-y-4">
                    <ScrollArea className="h-[calc(100vh-400px)]">
                      {renderStepConfig(selectedStep, !!editingStep)}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="variables" className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Available Variables</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        These variables can be used in templates and messages
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_WORKFLOW_VARIABLES.map((variable) => (
                          <div
                            key={variable}
                            className="p-2 bg-gray-50 rounded text-sm font-mono cursor-pointer hover:bg-gray-100"
                            onClick={() => navigator.clipboard.writeText(`{{${variable}}}`)}
                            title="Click to copy"
                          >
                            {variable}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No Step Selected
                  </h3>
                  <p className="text-gray-500">
                    Select a step from the list to configure it
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 