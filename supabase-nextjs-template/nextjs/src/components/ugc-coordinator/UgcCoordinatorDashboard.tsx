'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import { 
  Bot, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  GitBranch,
  BarChart3,
  User,
  Loader2
} from "lucide-react";
import { Brand } from '@/lib/types/powerbrief';
import { UgcCreator } from '@/lib/types/ugcCreator';

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  brand_id: string;
  current_step_id: string | null;
  current_step_name: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'waiting_human';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  context: Record<string, any>;
  completion_percentage: number;
  completed_steps: number;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

interface HumanReviewItem {
  id: string;
  workflow_execution_id: string;
  step_id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  brand_id: string;
  assigned_to: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  context: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UgcCoordinatorDashboardProps {
  brand: Brand;
  creators: UgcCreator[];
  onRefresh: () => void;
}

export default function UgcCoordinatorDashboard({ brand, onRefresh }: UgcCoordinatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'executions' | 'human-review' | 'analytics'>('overview');
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [humanReviewItems, setHumanReviewItems] = useState<HumanReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Human Review Dialog State
  const [selectedReviewItem, setSelectedReviewItem] = useState<HumanReviewItem | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'complete' | 'skip'>('complete');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [brand.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [executionsResponse, humanReviewResponse] = await Promise.all([
        fetch(`/api/ugc/workflow/executions?brandId=${brand.id}`),
        fetch(`/api/ugc/workflow/human-review?brandId=${brand.id}`)
      ]);

      if (!executionsResponse.ok || !humanReviewResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [executionsData, humanReviewData] = await Promise.all([
        executionsResponse.json(),
        humanReviewResponse.json()
      ]);

      setExecutions(executionsData.executions || []);
      setHumanReviewItems(humanReviewData.items || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewItem = (item: HumanReviewItem) => {
    setSelectedReviewItem(item);
    setResolutionNotes('');
    setReviewAction('complete');
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedReviewItem) return;

    try {
      setSubmittingReview(true);
      setError(null);

      const response = await fetch(`/api/ugc/workflow/human-review/${selectedReviewItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          resolution_notes: resolutionNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Refresh data and close dialog
      await loadDashboardData();
      setShowReviewDialog(false);
      setSelectedReviewItem(null);
      onRefresh();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pauseExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/ugc/workflow/executions/${executionId}/pause`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to pause execution');
      }

      await loadDashboardData();
    } catch (err) {
      console.error('Error pausing execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause execution');
    }
  };

  const resumeExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/ugc/workflow/executions/${executionId}/resume`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to resume execution');
      }

      await loadDashboardData();
    } catch (err) {
      console.error('Error resuming execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume execution');
    }
  };

  const retryExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/ugc/workflow/executions/${executionId}/retry`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to retry execution');
      }

      await loadDashboardData();
    } catch (err) {
      console.error('Error retrying execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry execution');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_human': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'waiting_human': return <User className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p>Loading UGC Coordinator Dashboard...</p>
        </div>
      </div>
    );
  }

  const runningExecutions = executions.filter(e => e.status === 'running');
  const completedExecutions = executions.filter(e => e.status === 'completed');
  const failedExecutions = executions.filter(e => e.status === 'failed');
  const pendingReviewItems = humanReviewItems.filter(item => item.status === 'pending');
  const urgentReviewItems = pendingReviewItems.filter(item => item.priority === 'urgent');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">UGC Coordinator</h2>
            <p className="text-gray-600">Workflow automation and human review dashboard</p>
          </div>
        </div>
        
        <Button onClick={loadDashboardData} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'executions' | 'human-review' | 'analytics')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="executions">
            <GitBranch className="h-4 w-4 mr-2" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="human-review">
            <User className="h-4 w-4 mr-2" />
            Human Review
            {pendingReviewItems.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {pendingReviewItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{runningExecutions.length}</div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingReviewItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  {urgentReviewItems.length} urgent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {completedExecutions.filter(e => 
                    new Date(e.completed_at || '').toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">Workflows completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Workflows</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{failedExecutions.length}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest workflow executions and human reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <p className="font-medium">{execution.workflow_name}</p>
                        <p className="text-sm text-gray-600">{execution.creator_name}</p>
                        <p className="text-xs text-gray-500">
                          Step: {execution.current_step_name} ({execution.completed_steps}/{execution.total_steps})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <Badge className={getStatusColor(execution.status)}>
                          {execution.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {execution.completion_percentage}% complete
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {executions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workflow executions yet</p>
                    <p className="text-sm">Workflows will appear here when they start running</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Executions</CardTitle>
              <CardDescription>Monitor and manage all workflow executions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(execution.status)}
                        <div>
                          <h4 className="font-medium">{execution.workflow_name}</h4>
                          <p className="text-sm text-gray-600">{execution.creator_name} • {execution.creator_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(execution.status)}>
                          {execution.status.replace('_', ' ')}
                        </Badge>
                        {execution.status === 'running' && (
                          <Button size="sm" variant="outline" onClick={() => pauseExecution(execution.id)}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {execution.status === 'paused' && (
                          <Button size="sm" variant="outline" onClick={() => resumeExecution(execution.id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {execution.status === 'failed' && (
                          <Button size="sm" variant="outline" onClick={() => retryExecution(execution.id)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress: {execution.current_step_name}</span>
                        <span>{execution.completed_steps}/{execution.total_steps} steps</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${execution.completion_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Started: {new Date(execution.started_at).toLocaleString()}</span>
                        {execution.completed_at && (
                          <span>Completed: {new Date(execution.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {execution.error_message && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{execution.error_message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
                
                {executions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workflow executions found</p>
                    <p className="text-sm">Executions will appear here when workflows are triggered</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Human Review Tab */}
        <TabsContent value="human-review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Human Review Queue</CardTitle>
              <CardDescription>Items requiring human attention and decision-making</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {humanReviewItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.creator_name} • {item.creator_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                        {item.status === 'pending' && (
                          <Button size="sm" onClick={() => handleReviewItem(item)}>
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                      {item.due_date && (
                        <span>Due: {new Date(item.due_date).toLocaleString()}</span>
                      )}
                    </div>

                    {item.context && Object.keys(item.context).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-700 mb-2">Context:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(item.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                
                {humanReviewItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items in review queue</p>
                    <p className="text-sm">Human review items will appear here when workflows require manual intervention</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Analytics</CardTitle>
              <CardDescription>Performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics coming soon</p>
                <p className="text-sm">Detailed workflow performance metrics and insights will be available here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Human Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Human Review: {selectedReviewItem?.title}</DialogTitle>
            <DialogDescription>
              Review and take action on this workflow item
            </DialogDescription>
          </DialogHeader>
          
          {selectedReviewItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Creator</Label>
                <p className="text-sm text-gray-600">
                  {selectedReviewItem.creator_name} ({selectedReviewItem.creator_email})
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-600">{selectedReviewItem.description}</p>
              </div>
              
              {selectedReviewItem.context && Object.keys(selectedReviewItem.context).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Context</Label>
                  <pre className="text-xs bg-gray-50 p-3 rounded border mt-1 whitespace-pre-wrap">
                    {JSON.stringify(selectedReviewItem.context, null, 2)}
                  </pre>
                </div>
              )}
              
              <div>
                <Label htmlFor="review-action">Action</Label>
                <Select value={reviewAction} onValueChange={(value) => setReviewAction(value as 'complete' | 'skip')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">Complete & Continue Workflow</SelectItem>
                    <SelectItem value="skip">Skip This Step</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="resolution-notes">Resolution Notes</Label>
                <Textarea
                  id="resolution-notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about your decision and any actions taken..."
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}