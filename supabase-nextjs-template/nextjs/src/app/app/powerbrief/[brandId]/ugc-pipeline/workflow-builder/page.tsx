'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  UgcWorkflowTemplate, 
  UgcWorkflowStep, 
  UgcWorkflowAction,
  WorkflowCategory,
  TriggerEvent,
  StepType
} from '@/lib/types/ugcWorkflow';
import { Plus, Play, Pause, Zap, GitBranch, Clock, User, Copy, Save, Download } from 'lucide-react';

// Simplified workflow builder without ReactFlow for now
interface ParamsType {
  brandId: string;
}

export default function WorkflowBuilderPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const resolvedParams = params instanceof Promise ? { brandId: '' } : params;
  const [workflows, setWorkflows] = useState<UgcWorkflowTemplate[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UgcWorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [availableActions, setAvailableActions] = useState<UgcWorkflowAction[]>([]);
  
  // Create Workflow Dialog State
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'onboarding' as WorkflowCategory,
    trigger_event: 'creator_added' as TriggerEvent,
  });

  // Load workflows and actions
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workflows
        const workflowsResponse = await fetch(`/api/ugc/workflow/templates?brandId=${resolvedParams.brandId}`);
        if (workflowsResponse.ok) {
          const workflowsData = await workflowsResponse.json();
          setWorkflows(workflowsData);
        }

        // Load available actions
        const actionsResponse = await fetch('/api/ugc/workflow/actions');
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          setAvailableActions(actionsData);
        }
      } catch (error) {
        console.error('Error loading workflow data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedParams.brandId) {
      loadData();
    }
  }, [resolvedParams.brandId]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/ugc/workflow/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newWorkflow,
          brand_id: resolvedParams.brandId,
        }),
      });

      if (response.ok) {
        const createdWorkflow = await response.json();
        setWorkflows([...workflows, createdWorkflow]);
        setSelectedWorkflow(createdWorkflow);
        setIsCreateDialogOpen(false);
        setNewWorkflow({
          name: '',
          description: '',
          category: 'onboarding',
          trigger_event: 'creator_added',
        });
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const saveWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/ugc/workflow/templates/${selectedWorkflow.id}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ steps: [] }),
      });

      if (response.ok) {
        console.log('Workflow saved successfully');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">UGC Workflow Builder</h1>
          <p className="text-gray-600">Create and manage automated workflows for your UGC creators</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Set up a new automation workflow for your UGC creators.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    placeholder="e.g., Creator Onboarding"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    placeholder="Describe what this workflow does..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newWorkflow.category}
                    onValueChange={(value) => setNewWorkflow({ ...newWorkflow, category: value as WorkflowCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="script_pipeline">Script Pipeline</SelectItem>
                      <SelectItem value="rate_negotiation">Rate Negotiation</SelectItem>
                      <SelectItem value="product_shipment">Product Shipment</SelectItem>
                      <SelectItem value="contract_signing">Contract Signing</SelectItem>
                      <SelectItem value="content_delivery">Content Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trigger">Trigger Event</Label>
                  <Select
                    value={newWorkflow.trigger_event}
                    onValueChange={(value) => setNewWorkflow({ ...newWorkflow, trigger_event: value as TriggerEvent })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creator_added">Creator Added</SelectItem>
                      <SelectItem value="status_change">Status Change</SelectItem>
                      <SelectItem value="manual">Manual Trigger</SelectItem>
                      <SelectItem value="time_based">Time Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkflow} disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Workflow'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* Workflow List */}
          <Card>
            <CardHeader>
              <CardTitle>Workflows</CardTitle>
              <CardDescription>Select a workflow to edit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedWorkflow?.id === workflow.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-sm text-gray-500">{workflow.description}</div>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="secondary">{workflow.category}</Badge>
                      <Badge variant="outline">{workflow.trigger_event}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Available Actions</CardTitle>
              <CardDescription>Actions you can add to workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableActions.map((action) => (
                  <div key={action.id} className="flex items-center gap-2 p-2 border rounded">
                    <Zap className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-sm">{action.name}</div>
                      <div className="text-xs text-gray-500">{action.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {selectedWorkflow && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button onClick={saveWorkflow} disabled={isSaving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Canvas */}
        <div className="flex-1 border rounded-lg">
          {selectedWorkflow ? (
            <div className="h-full p-6">
              <h2 className="text-xl font-semibold mb-4">{selectedWorkflow.name}</h2>
              <p className="text-gray-600 mb-6">{selectedWorkflow.description}</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Start: {selectedWorkflow.trigger_event}</span>
                </div>
                
                <div className="text-center text-gray-500">
                  Visual workflow builder coming soon!
                  <br />
                  For now, you can create and manage workflow templates.
                </div>
                
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <Pause className="h-5 w-5 text-red-600" />
                  <span className="font-medium">End: Workflow Complete</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Workflow Selected</h3>
                <p className="text-gray-500 mb-4">Select a workflow from the sidebar to start editing</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 