'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UgcWorkflowTemplate, 
  WorkflowCategory,
  TriggerEvent
} from '@/lib/types/ugcWorkflow';
import { Plus, GitBranch, Settings, List, MessageSquare, BarChart3 } from 'lucide-react';
import WorkflowBuilder from '@/components/ugc/workflow/WorkflowBuilder';
import CreatorStatusManager from '@/components/ugc/workflow/CreatorStatusManager';
import MessageTemplateManager from '@/components/ugc/workflow/MessageTemplateManager';
import WorkflowAnalytics from '@/components/ugc/workflow/WorkflowAnalytics';
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate
} from '@/lib/services/ugcWorkflowService';

// Simplified workflow builder without ReactFlow for now
interface ParamsType {
  brandId: string;
}

export default function WorkflowBuilderPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  // Handle params unwrapping for React 19+ compatibility
  const [brandId, setBrandId] = useState<string>('');
  const [paramsPending, setParamsPending] = useState(true);
  
  const [workflows, setWorkflows] = useState<UgcWorkflowTemplate[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UgcWorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  
  // Create Workflow Dialog State
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'onboarding' as WorkflowCategory,
    trigger_event: 'creator_added' as TriggerEvent,
  });

  // Handle params unwrapping
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setBrandId(resolvedParams.brandId);
      setParamsPending(false);
    };
    
    unwrapParams();
  }, [params]);

  // Load workflows
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setIsLoading(true);
        const data = await getWorkflowTemplates(brandId);
        setWorkflows(data);
        if (data.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(data[0]);
        }
      } catch (error) {
        console.error('Error loading workflows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (brandId && !paramsPending) {
      loadWorkflows();
    }
  }, [brandId, paramsPending]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;

    setIsSaving(true);
    try {
      const createdWorkflow = await createWorkflowTemplate({
        ...newWorkflow,
        brand_id: brandId,
        is_active: true
      });

      setWorkflows([...workflows, createdWorkflow]);
      setSelectedWorkflow(createdWorkflow);
      setIsCreateDialogOpen(false);
      setNewWorkflow({
        name: '',
        description: '',
        category: 'onboarding',
        trigger_event: 'creator_added',
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsSaving(true);
    try {
      await updateWorkflowTemplate(selectedWorkflow.id, {
        is_active: selectedWorkflow.is_active
      });
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render anything until params are resolved
  if (paramsPending || !brandId) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">UGC Workflow Automation</h1>
        <p className="text-gray-600">Build and manage automated workflows for your UGC creators</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="workflows">
            <GitBranch className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="statuses">
            <List className="h-4 w-4 mr-2" />
            Creator Statuses
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Workflow Templates</h2>
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

          {workflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                <p className="text-gray-500 mb-4">Create your first workflow to start automating</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Workflow List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Workflows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
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
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{workflow.name}</div>
                              <div className="text-sm text-gray-500">{workflow.description}</div>
                              <div className="flex gap-1 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {workflow.category}
                                </Badge>
                                {workflow.is_active ? (
                                  <Badge variant="default" className="text-xs">Active</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Builder */}
              <div className="lg:col-span-3">
                {selectedWorkflow && (
                  <WorkflowBuilder
                    workflow={selectedWorkflow}
                    brandId={brandId}
                    onSave={handleSaveWorkflow}
                  />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="statuses">
          <CreatorStatusManager brandId={brandId} />
        </TabsContent>

        <TabsContent value="templates">
          <MessageTemplateManager brandId={brandId} />
        </TabsContent>

        <TabsContent value="analytics">
          <WorkflowAnalytics brandId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 