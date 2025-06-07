'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Alert, AlertDescription, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Bot, Brain, Mail, MessageSquare, Settings, History, Zap, AlertTriangle, CheckCircle, Clock, Users, Eye, Send, Play } from "lucide-react";
import { AiCoordinator } from '@/lib/services/ugcAiCoordinator';
import { UgcCreator } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LiveAnalysisStream from './LiveAnalysisStream';
import AiChatAssistant from '@/components/ugc/AiChatAssistant';

interface EmailPreview {
  subject: string;
  htmlContent: string;
  textContent: string;
  reasoning: string;
  recipient: {
    name: string;
    email: string;
  };
}

interface UgcAiCoordinatorPanelProps {
  brand: Brand;
  creators: UgcCreator[];
  onRefresh: () => void;
}

interface PipelineAnalysis {
  summary: string;
  actions: Array<{
    creator: UgcCreator;
    recommendedActions: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      description: string;
      emailTemplate?: string;
      variables?: Record<string, string | number>;
    }>;
    analysis: string;
  }>;
}

export default function UgcAiCoordinatorPanel({ brand, creators, onRefresh }: UgcAiCoordinatorPanelProps) {
  const [coordinator, setCoordinator] = useState<AiCoordinator | null>(null);
  const [analysis, setAnalysis] = useState<PipelineAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'actions' | 'settings' | 'history' | 'assistant'>('dashboard');
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewingAction, setPreviewingAction] = useState<{creatorId: string, actionIndex: number} | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    proactivity_level: 'medium' as 'low' | 'medium' | 'high',
    auto_send_emails: false,
    require_approval: true,
    email_automation_enabled: true,
    slack_notifications_enabled: false,
    working_hours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/Los_Angeles'
    },
    follow_up_delays: {
      onboarding: 48,
      script_pipeline: 24
    }
  });

  useEffect(() => {
    loadCoordinator();
  }, [brand.id]);

  const loadCoordinator = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would need to be implemented as an API endpoint
      const response = await fetch(`/api/ugc/ai-coordinator?brandId=${brand.id}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load AI coordinator');
      }
      
      const data = await response.json();
      setCoordinator(data.coordinator);
      
      // Safely load settings with proper fallbacks
      setSettings(prev => ({
        ...prev,
        proactivity_level: data.coordinator.settings?.proactivity_level || 'medium',
        auto_send_emails: data.coordinator.settings?.auto_send_emails || false,
        require_approval: data.coordinator.settings?.require_approval !== false, // Default to true
        email_automation_enabled: data.coordinator.email_automation_enabled !== false,
        slack_notifications_enabled: data.coordinator.slack_notifications_enabled || false,
        working_hours: data.coordinator.settings?.working_hours || prev.working_hours,
        follow_up_delays: data.coordinator.settings?.follow_up_delays || prev.follow_up_delays
      }));
    } catch (err) {
      console.error('Error loading coordinator:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coordinator');
    } finally {
      setLoading(false);
    }
  };

  const analyzePipeline = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      
      const response = await fetch(`/api/ugc/ai-coordinator/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze pipeline');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Error analyzing pipeline:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze pipeline');
    } finally {
      setAnalyzing(false);
    }
  };

  const previewEmail = async (creatorId: string, actionIndex: number) => {
    if (!analysis || !coordinator) return;
    
    try {
      setError(null);
      setPreviewingAction({ creatorId, actionIndex });
      
      const creatorAction = analysis.actions.find(a => a.creator.id === creatorId);
      if (!creatorAction) return;
      
      const action = creatorAction.recommendedActions[actionIndex];
      
      // Only preview email actions
      if (action.type !== 'email_sent') {
        setError('This action does not involve sending an email');
        return;
      }
      
      const response = await fetch(`/api/ugc/ai-coordinator/preview-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinatorId: coordinator.id,
          action: {
            type: action.type,
            creator: creatorAction.creator,
            emailTemplate: action.emailTemplate,
            variables: action.variables,
            brand,
            includeElements: ['greeting', 'action_items', 'next_steps']
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate email preview');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEmailPreview(result.preview);
        setShowPreviewDialog(true);
      } else {
        setError(result.error || 'Failed to generate email preview');
      }
    } catch (err) {
      console.error('Error generating email preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate email preview');
    } finally {
      setPreviewingAction(null);
    }
  };

  const executeAction = async (creatorId: string, actionIndex: number) => {
    if (!analysis || !coordinator) return;
    
    try {
      setError(null);
      
      const creatorAction = analysis.actions.find(a => a.creator.id === creatorId);
      if (!creatorAction) return;
      
      const action = creatorAction.recommendedActions[actionIndex];
      
      const response = await fetch(`/api/ugc/ai-coordinator/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinatorId: coordinator.id,
          action: {
            type: action.type,
            creator: creatorAction.creator,
            emailTemplate: action.emailTemplate,
            variables: action.variables,
            brand
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute action');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Close preview dialog if open
        setShowPreviewDialog(false);
        setEmailPreview(null);
        
        // Refresh analysis after successful action
        await analyzePipeline();
        onRefresh(); // Refresh parent component
      } else {
        setError(result.message || 'Action failed');
      }
    } catch (err) {
      console.error('Error executing action:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    }
  };

  const executeFromPreview = async () => {
    if (!previewingAction) return;
    await executeAction(previewingAction.creatorId, previewingAction.actionIndex);
  };

  const updateSettings = async () => {
    if (!coordinator) return;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/ugc/ai-coordinator/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinatorId: coordinator.id,
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      await loadCoordinator(); // Reload to get updated settings
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'email_follow_up': return <Mail className="h-4 w-4" />;
      case 'contract_reminder': return <AlertTriangle className="h-4 w-4" />;
      case 'shipping_update': return <CheckCircle className="h-4 w-4" />;
      case 'payment_request': return <Clock className="h-4 w-4" />;
      case 'script_assignment': return <MessageSquare className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p>Loading AI UGC Coordinator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI UGC Coordinator</h2>
            <p className="text-gray-600">Intelligent creator relationship management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {coordinator && (
            <Badge variant={coordinator.enabled ? "default" : "secondary"}>
              {coordinator.enabled ? 'Active' : 'Inactive'}
            </Badge>
          )}
          <Button 
            onClick={analyzePipeline}
            disabled={analyzing}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {analyzing ? (
              <>
                <Brain className="h-4 w-4 animate-pulse mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Analyze Pipeline
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'actions' | 'settings' | 'history' | 'assistant')}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creators.length}</div>
                <p className="text-xs text-muted-foreground">Across all pipeline stages</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Action Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis?.actions.reduce((sum, action) => sum + action.recommendedActions.length, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis?.actions.reduce((sum, action) => sum + action.recommendedActions.filter(a => a.priority === 'high').length, 0) || 0} high priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Analysis</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {coordinator?.last_activity_at ? 'Recent' : 'Never'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {coordinator?.last_activity_at 
                    ? new Date(coordinator.last_activity_at).toLocaleDateString()
                    : 'Run analysis to get started'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Summary</CardTitle>
                <CardDescription>Latest analysis from AI Coordinator</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{analysis.summary}</p>
                
                <div className="space-y-4">
                  {analysis.actions.filter(action => action.recommendedActions.length > 0).map((action) => (
                    <div key={action.creator.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{action.creator.name}</h4>
                        <Badge variant="outline">{action.creator.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{action.analysis}</p>
                      
                      <div className="space-y-2">
                        {action.recommendedActions.map((recommendedAction, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-3">
                            <div className="flex items-center space-x-3">
                              {getActionIcon(recommendedAction.type)}
                              <div>
                                <p className="text-sm font-medium">{recommendedAction.description}</p>
                                <Badge className={`text-xs ${getPriorityColor(recommendedAction.priority)}`}>
                                  {recommendedAction.priority} priority
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {recommendedAction.type === 'email_sent' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => previewEmail(action.creator.id, index)}
                                  disabled={previewingAction?.creatorId === action.creator.id && previewingAction?.actionIndex === index}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Preview
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                onClick={() => executeAction(action.creator.id, index)}
                              >
                                Execute
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>AI-generated recommendations for creator management</CardDescription>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Run pipeline analysis to see recommended actions</p>
                  <div className="flex items-center justify-center space-x-4 mt-4">
                    <Button onClick={analyzePipeline} disabled={analyzing}>
                      <Zap className="h-4 w-4 mr-2" />
                      {analyzing ? 'Analyzing...' : 'Analyze Now'}
                    </Button>
                    <LiveAnalysisStream 
                      brandId={brand.id}
                      triggerElement={
                        <Button variant="outline">
                          <Play className="h-4 w-4 mr-2" />
                          Live Stream
                        </Button>
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {analysis.actions.filter(action => action.recommendedActions.length > 0).map((action) => (
                    <div key={action.creator.id} className="space-y-4">
                      <div className="flex items-center space-x-3 pb-2 border-b">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{action.creator.name}</h3>
                          <p className="text-sm text-gray-600">{action.creator.status}</p>
                        </div>
                      </div>
                      
                      {action.recommendedActions.map((recommendedAction, index) => (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                {getActionIcon(recommendedAction.type)}
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{recommendedAction.description}</p>
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Badge className={`text-xs ${getPriorityColor(recommendedAction.priority)}`}>
                                      {recommendedAction.priority}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {recommendedAction.type.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {recommendedAction.type === 'email_sent' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => previewEmail(action.creator.id, index)}
                                    disabled={previewingAction?.creatorId === action.creator.id && previewingAction?.actionIndex === index}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Preview
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  onClick={() => executeAction(action.creator.id, index)}
                                >
                                  Execute
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="assistant" className="space-y-6">
          <AiChatAssistant 
            brandId={brand.id}
            brandName={brand.name}
            creators={creators.map(c => ({ id: c.id, name: c.name || c.email || 'Unknown', status: c.status }))}
            embedded={true}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Coordinator Settings</CardTitle>
              <CardDescription>Configure how the AI coordinator operates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="proactivity">Proactivity Level</Label>
                  <Select 
                    value={settings.proactivity_level} 
                    onValueChange={(value) => setSettings(prev => ({...prev, proactivity_level: value as 'low' | 'medium' | 'high'}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Only critical issues</SelectItem>
                      <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                      <SelectItem value="high">High - Proactive outreach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Automation</Label>
                    <p className="text-sm text-gray-600">Enable automated email sending</p>
                  </div>
                  <Switch
                    checked={settings.email_automation_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({...prev, email_automation_enabled: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Send Emails</Label>
                    <p className="text-sm text-gray-600">Send emails automatically without approval</p>
                  </div>
                  <Switch
                    checked={settings.auto_send_emails}
                    onCheckedChange={(checked) => setSettings(prev => ({...prev, auto_send_emails: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval</Label>
                    <p className="text-sm text-gray-600">Require manual approval for actions</p>
                  </div>
                  <Switch
                    checked={settings.require_approval}
                    onCheckedChange={(checked) => setSettings(prev => ({...prev, require_approval: checked}))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Slack Notifications</Label>
                    <p className="text-sm text-gray-600">Send updates to Slack</p>
                  </div>
                  <Switch
                    checked={settings.slack_notifications_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({...prev, slack_notifications_enabled: checked}))}
                  />
                </div>
              </div>

              <Button onClick={updateSettings} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>Recent AI coordinator actions and decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Activity history will appear here</p>
                <p className="text-sm text-gray-500">Actions, emails sent, and analysis results</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showPreviewDialog && emailPreview && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                Review the email before sending to {emailPreview.recipient?.name} ({emailPreview.recipient?.email})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded border">
                  {emailPreview.subject}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email Content</Label>
                <div className="mt-1 p-4 bg-gray-50 rounded border max-h-[400px] overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: emailPreview.htmlContent }} />
                </div>
              </div>
              
              {emailPreview.reasoning && (
                <div>
                  <Label className="text-sm font-medium">AI Reasoning</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded border text-sm">
                    {emailPreview.reasoning}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={executeFromPreview}>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 