'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bot,
  Zap,
  Play,
  Pause,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { n8nService, BrandWorkflowConfig } from '@/lib/services/n8nService';

// Simplified types for shared workflow management
interface SharedWorkflow {
  name: string;
  display_name: string;
  description: string;
  category: string;
  webhook_url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AutomationManagerProps {
  brandId: string;
}

// Define available shared workflows
const SHARED_WORKFLOWS: SharedWorkflow[] = [
  {
    name: 'creator_application_acknowledgment',
    display_name: 'Creator Application Acknowledgment',
    description: 'Automatically send welcome email when creators submit applications',
    category: 'Onboarding',
    webhook_url: process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK || 'https://primary-production-f140.up.railway.app/webhook/powerbrief-creator-acknowledgment',
    icon: UserPlus,
  },
  {
    name: 'creator_approved_for_next_steps',
    display_name: 'Creator Approved AI Agent',
    description: 'AI agent that initiates conversation when creator is approved for next steps',
    category: 'AI Engagement',
    webhook_url: process.env.NEXT_PUBLIC_N8N_CREATOR_APPROVED || 'https://primary-production-f140.up.railway.app/webhook-test/867ac9d6-87ac-4c91-b8d5-4ff8a73111b1',
    icon: UserPlus,
  },
  // Add more workflows here as you create them manually in n8n
];

export default function AutomationManager({ brandId }: AutomationManagerProps) {
  const [brandWorkflows, setBrandWorkflows] = useState<BrandWorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // Track which workflow is being saved

  useEffect(() => {
    loadBrandWorkflows();
  }, [brandId]);

  const loadBrandWorkflows = async () => {
    setLoading(true);
    try {
      const workflows = await n8nService.getBrandWorkflowConfig(brandId);
      setBrandWorkflows(workflows);
    } catch (error) {
      console.error('Error loading brand workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowName: string, isActive: boolean) => {
    setSaving(workflowName);
    try {
      await n8nService.toggleBrandWorkflow(brandId, workflowName, isActive);
      
      // Update local state
      setBrandWorkflows(prev => 
        prev.map(w => 
          w.workflow_name === workflowName 
            ? { ...w, is_active: isActive, updated_at: new Date().toISOString() }
            : w
        )
      );
      
      // If workflow doesn't exist in local state, add it
      if (!brandWorkflows.some(w => w.workflow_name === workflowName)) {
        const newConfig: BrandWorkflowConfig = {
          id: `temp-${Date.now()}`, // Temporary ID
          brand_id: brandId,
          workflow_name: workflowName,
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setBrandWorkflows(prev => [...prev, newConfig]);
      }
      
    } catch (error) {
      console.error('Error toggling workflow:', error);
    } finally {
      setSaving(null);
    }
  };

  const getWorkflowConfig = (workflowName: string): BrandWorkflowConfig | undefined => {
    return brandWorkflows.find(w => w.workflow_name === workflowName);
  };

  const isWorkflowActive = (workflowName: string): boolean => {
    const config = getWorkflowConfig(workflowName);
    return config?.is_active || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading automations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Automation Center
          </h2>
          <p className="text-gray-600 mt-1">
            Activate shared workflows for your brand
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => loadBrandWorkflows()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          These are shared workflows that have been pre-configured. You can activate them for your brand.
          The webhook will automatically include your brand information when triggered.
        </AlertDescription>
      </Alert>

      {/* Available Shared Workflows */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">Available Workflows</h3>
        
        {SHARED_WORKFLOWS.map((workflow) => {
          const config = getWorkflowConfig(workflow.name);
          const isActive = isWorkflowActive(workflow.name);
          const isSaving = saving === workflow.name;
          
          const IconComponent = workflow.icon;

          return (
            <Card key={workflow.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{workflow.display_name}</CardTitle>
                      <CardDescription className="mt-1">
                        {workflow.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={isActive ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {isActive ? (
                        <>
                          <Play className="h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </Badge>
                    
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => toggleWorkflow(workflow.name, checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Badge variant="outline">{workflow.category}</Badge>
                    <span>•</span>
                    <span>Webhook: {workflow.name}</span>
                  </div>
                  
                  {config && (
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(config.updated_at).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ExternalLink className="h-3 w-3" />
                    <code className="bg-gray-100 px-1 rounded">
                      {workflow.webhook_url}
                    </code>
                  </div>
                  
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {brandWorkflows.filter(w => w.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active Workflows</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {SHARED_WORKFLOWS.length - brandWorkflows.filter(w => w.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Available Workflows</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 