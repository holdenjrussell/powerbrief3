'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Alert, AlertDescription, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Bot, Brain, Mail, MessageSquare, Settings, History, Zap, AlertTriangle, CheckCircle, Clock, Users, Eye, Send, Play, FileText, UserCheck, Calendar, DollarSign, Package, Camera, Edit, Trash2, Filter, Search, MoreHorizontal } from "lucide-react";
import { UgcCreator } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WorkflowExecution {
  id: string;
  workflow_name: string;
  creator_id: string;
  creator_name: string;
  status: 'running' | 'completed' | 'failed' | 'pending_human_review';
  trigger_event: string;
  started_at: string;
  completed_at?: string;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  context: {
    creator_status?: string;
    script_assigned?: string;
    email_sent?: boolean;
    human_action_required?: string;
  };
}

interface HumanReviewItem {
  id: string;
  workflow_execution_id: string;
  creator_id: string;
  creator_name: string;
  review_type: 'creator_approval' | 'script_assignment' | 'rate_negotiation' | 'content_review' | 'status_update';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  context: Record<string, any>;
  actions: Array<{
    id: string;
    label: string;
    action_type: string;
    data?: Record<string, any>;
  }>;
}

interface UgcCoordinatorDashboardProps {
  brand: Brand;
  creators: UgcCreator[];
  onRefresh: () => void;
}

export default function UgcCoordinatorDashboard({ brand, creators, onRefresh }: UgcCoordinatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'human-review' | 'settings'>('dashboard');
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([]);
  const [humanReviewItems, setHumanReviewItems] = useState<HumanReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviewItem, setSelectedReviewItem] = useState<HumanReviewItem | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [brand.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load workflow executions
      const executionsResponse = await fetch(`/api/ugc/workflow/executions?brandId=${brand.id}`);
      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        setWorkflowExecutions(executionsData);
      }
      
      // Load human review items
      const reviewResponse = await fetch(`/api/ugc/workflow/human-review?brandId=${brand.id}`);
      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        setHumanReviewItems(reviewData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (reviewItem: HumanReviewItem, actionId: string, notes?: string) => {
    try {
      setProcessingReview(true);
      
      const response = await fetch(`/api/ugc/workflow/human-review/${reviewItem.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          notes: notes || reviewNotes,
          brand_id: brand.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process review action');
      }
      
      // Refresh data
      await loadDashboardData();
      onRefresh();
      
      // Close dialog
      setShowReviewDialog(false);
      setSelectedReviewItem(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Error processing review action:', err);
      setError('Failed to process review action');
    } finally {
      setProcessingReview(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'pending_human_review': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredExecutions = workflowExecutions.filter(execution => {
    if (statusFilter !== 'all' && execution.status !== statusFilter) return false;
    if (searchQuery && !execution.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !execution.workflow_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingReviews = humanReviewItems.filter(item => item.review_type);
  const highPriorityReviews = pendingReviews.filter(item => item.priority === 'high');

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
            <p className="text-gray-600">Workflow automation dashboard and human review center</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={loadDashboardData}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Brain className="h-4 w-4 animate-pulse mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'history' | 'human-review' | 'settings')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="human-review">
            Human Review
            {highPriorityReviews.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {highPriorityReviews.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Workflow History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflowExecutions.filter(w => w.status === 'running').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently executing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingReviews.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {highPriorityReviews.length} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {workflowExecutions.filter(w => 
                    w.status === 'completed' && 
                    new Date(w.completed_at || '').toDateString() === new Date().toDateString()
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">Workflows completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creators.length}</div>
                <p className="text-xs text-muted-foreground">In pipeline</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Activity</CardTitle>
              <CardDescription>Latest workflow executions and status updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredExecutions.slice(0, 5).map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Badge className={getStatusColor(execution.status)}>
                          {execution.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{execution.workflow_name}</p>
                        <p className="text-sm text-gray-600">
                          Creator: {execution.creator_name} • Step: {execution.current_step}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(execution.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {execution.completed_steps}/{execution.total_steps} steps
                        </p>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(execution.completed_steps / execution.total_steps) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {filteredExecutions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workflow executions found</p>
                    <p className="text-sm">Workflows will appear here as they run</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Human Review Tab */}
        <TabsContent value="human-review" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Human Review Queue</h3>
              <p className="text-gray-600">Items requiring manual review and approval</p>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {pendingReviews.map((reviewItem) => (
              <Card key={reviewItem.id} className="border-l-4 border-l-yellow-400">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{reviewItem.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Creator: {reviewItem.creator_name} • {reviewItem.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getPriorityColor(reviewItem.priority)}>
                          {reviewItem.priority} priority
                        </Badge>
                        <Badge variant="outline">
                          {reviewItem.review_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(reviewItem.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedReviewItem(reviewItem);
                            setShowReviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Details
                        </DropdownMenuItem>
                        {reviewItem.actions.map((action) => (
                          <DropdownMenuItem 
                            key={action.id}
                            onClick={() => handleReviewAction(reviewItem, action.id)}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            ))}
            
            {pendingReviews.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-500">No items pending human review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Workflow History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Workflow Execution History</h3>
              <p className="text-gray-600">Complete history of workflow automations</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending_human_review">Pending Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredExecutions.map((execution) => (
              <Card key={execution.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{execution.workflow_name}</CardTitle>
                      <CardDescription className="mt-1">
                        Creator: {execution.creator_name} • Triggered by: {execution.trigger_event}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(execution.status)}>
                          {execution.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Started: {new Date(execution.started_at).toLocaleString()}
                        </span>
                        {execution.completed_at && (
                          <span className="text-xs text-gray-500">
                            Completed: {new Date(execution.completed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {execution.completed_steps}/{execution.total_steps} steps
                      </p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(execution.completed_steps / execution.total_steps) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    Current Step: {execution.current_step}
                  </div>
                  {execution.context && Object.keys(execution.context).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Context: {JSON.stringify(execution.context, null, 2)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coordinator Settings</CardTitle>
              <CardDescription>Configure automation and notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Auto-execute workflows</Label>
                    <p className="text-sm text-gray-600">Automatically run workflows without manual approval</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Slack notifications</Label>
                    <p className="text-sm text-gray-600">Send notifications to Slack for human review items</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email notifications</Label>
                    <p className="text-sm text-gray-600">Send email alerts for high priority reviews</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Human Review Required</DialogTitle>
            <DialogDescription>
              {selectedReviewItem?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReviewItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Creator</Label>
                <p className="text-sm">{selectedReviewItem.creator_name}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm">{selectedReviewItem.description}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Context</Label>
                <pre className="text-xs bg-gray-50 p-3 rounded border">
                  {JSON.stringify(selectedReviewItem.context, null, 2)}
                </pre>
              </div>
              
              <div>
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            {selectedReviewItem?.actions.map((action) => (
              <Button 
                key={action.id}
                onClick={() => handleReviewAction(selectedReviewItem, action.id)}
                disabled={processingReview}
                variant={action.action_type === 'approve' ? 'default' : 'outline'}
              >
                {processingReview ? 'Processing...' : action.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}