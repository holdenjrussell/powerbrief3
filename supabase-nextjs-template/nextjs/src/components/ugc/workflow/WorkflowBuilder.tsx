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
  Settings
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

  const renderStepConfig = (step: UgcWorkflowStep, isEditing: boolean = false) => {
    const currentStep = isEditing ? editingStep : step;
    if (!currentStep) return null;

    switch (currentStep.step_type) {
      case 'action':
        return (
          <div className="space-y-4">
            <div>
              <Label>Action Type</Label>
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
            </div>

            {currentStep.config.action_id === 'send_email' && (
              <div>
                <Label>Email Template</Label>
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
              </div>
            )}
          </div>
        );

      case 'wait':
        return (
          <div className="space-y-4">
            <div>
              <Label>Wait Duration (seconds)</Label>
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
              />
            </div>
          </div>
        );

      case 'human_intervention':
        return (
          <div className="space-y-4">
            <div>
              <Label>Intervention Title</Label>
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
              />
            </div>
            <div>
              <Label>Description</Label>
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
              />
            </div>
            <div>
              <Label>Priority</Label>
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
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Condition configuration coming soon...
            </p>
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
        <div className="flex gap-2">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(step.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="config" className="space-y-4">
                    {renderStepConfig(selectedStep, !!editingStep)}
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="retry">Retry on Failure</Label>
                        <Switch
                          id="retry"
                          checked={selectedStep.config.retry_on_failure || false}
                          disabled={!editingStep}
                        />
                      </div>
                      {selectedStep.config.retry_on_failure && (
                        <div>
                          <Label>Retry Count</Label>
                          <Input
                            type="number"
                            value={selectedStep.config.retry_count || 3}
                            disabled={!editingStep}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Timeout (seconds)</Label>
                        <Input
                          type="number"
                          value={selectedStep.config.timeout || ''}
                          placeholder="No timeout"
                          disabled={!editingStep}
                        />
                      </div>
                    </div>
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
                            className="p-2 bg-gray-50 rounded text-sm font-mono"
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