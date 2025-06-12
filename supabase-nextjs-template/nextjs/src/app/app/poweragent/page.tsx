"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Plus, 
  Building2, 
  AlertCircle, 
  Bot, 
  Zap, 
  Settings,
  Target,
  Workflow,
  Database,
  Eye,
  FileText,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PowerAgentPage() {
  const { user } = useGlobal();
  const { selectedBrand } = useBrand();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [voltAgentStatus, setVoltAgentStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const checkVoltAgent = useCallback(async () => {
    setVoltAgentStatus('checking');
    try {
      const response = await fetch('/api/poweragent/health');
      if (response.ok) {
        const data = await response.json();
        setVoltAgentStatus(data.status === 'connected' ? 'connected' : 'error');
      } else {
        setVoltAgentStatus('error');
      }
    } catch {
      setVoltAgentStatus('error');
    }
  }, []);

  useEffect(() => {
    checkVoltAgent();
  }, [checkVoltAgent]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              PowerAgent
            </h1>
            <p className="text-gray-600 mt-2">
              Intelligent AI agents to enhance your PowerBrief workflow
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => router.push('/app/settings?tab=poweragent')}>
              <Settings className="h-4 w-4" />
              Agent Settings
            </Button>
            <Button className="flex items-center gap-2" onClick={() => router.push('/app/poweragent/builder')}>
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </div>
        </div>

        {/* VoltAgent Status */}
        <Alert className={voltAgentStatus === 'connected' ? 'border-green-200 bg-green-50' : voltAgentStatus === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {voltAgentStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {voltAgentStatus === 'connected' && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
              {voltAgentStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
              <AlertDescription className={voltAgentStatus === 'error' ? 'text-red-700' : voltAgentStatus === 'connected' ? 'text-green-700' : 'text-blue-700'}>
                {voltAgentStatus === 'checking' && 'Connecting to VoltAgent framework...'}
                {voltAgentStatus === 'connected' && 'VoltAgent framework is connected and ready.'}
                {voltAgentStatus === 'error' && 'Unable to connect. Ensure API keys are set & VoltAgent server is running. Check .env.local.'}
              </AlertDescription>
            </div>
            {(voltAgentStatus === 'connected' || voltAgentStatus === 'error') && (
              <Button size="sm" variant="ghost" className="flex items-center gap-1" onClick={checkVoltAgent}>
                <RefreshCw className="h-3 w-3" />
                {voltAgentStatus === 'error' ? 'Retry Connection' : 'Refresh Status'}
              </Button>
            )}
          </div>
        </Alert>

        {/* Brand Context */}
        {selectedBrand && (
          <Alert className="mt-4">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Agents can be configured for <strong>{selectedBrand.name}</strong>. 
              Switch brands to apply agents to different contexts.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Agents</p>
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <Bot className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tasks Automated</p>
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <Zap className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Time Saved</p>
                    <p className="text-3xl font-bold">0h</p>
                  </div>
                  <Target className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Integrations</p>
                    <p className="text-3xl font-bold">0</p>
                  </div>
                  <Database className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Activity</CardTitle>
              <CardDescription>Latest actions performed by your AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No agent activity yet.</p>
                <p className="text-sm">Activity will appear here once your agents are active.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>VoltAgent Console</CardTitle>
              <CardDescription>Monitor and debug your agents in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-900 text-white rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">VoltOps Platform</p>
                  <p className="font-mono text-xs mt-1">https://console.voltagent.dev</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => window.open('https://console.voltagent.dev', '_blank')}
                >
                  Open Console
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your AI Agents</CardTitle>
              <CardDescription>Manage and configure your custom AI agents.</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No agents configured yet.</p>
              <Button className="mt-4" onClick={() => router.push('/app/poweragent/builder')}>
                <Plus className="h-4 w-4 mr-2" /> Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Workflows</CardTitle>
              <CardDescription>Configure and monitor automated workflows across PowerBrief</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-gray-500 py-8">
                <Workflow className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No workflows defined yet.</p>
                <Button className="mt-4" onClick={() => router.push('/app/poweragent/workflows/create')}>
                  <Plus className="h-4 w-4 mr-2" /> Create Workflow
                </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Analytics</CardTitle>
              <CardDescription>Performance metrics for your AI agents</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-gray-500 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Analytics will be available once agents are active and generating data.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your PowerAgent setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => router.push('/app/poweragent/builder')}>
              <Plus className="h-4 w-4" />
              Create New Agent
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => router.push('/app/settings?tab=poweragent')}>
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.open('https://console.voltagent.dev', '_blank')}
            >
              <Eye className="h-4 w-4" />
              VoltOps Console
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => window.open('/docs/poweragent', '_blank')}>
              <FileText className="h-4 w-4" />
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 