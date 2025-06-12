"use client";

import React, { useState } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Save, 
  Bot, 
  Settings,
  Wrench,
  Database,
  Mic,
  Zap,
  GitBranch,
  TestTube,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AgentBasicInfo from '@/components/poweragent/builder/AgentBasicInfo';
import ProviderSelector from '@/components/poweragent/builder/ProviderSelector';
import InstructionsEditor from '@/components/poweragent/builder/InstructionsEditor';
import ToolsManager from '@/components/poweragent/builder/ToolsManager';
import { MemoryConfig } from '@/components/poweragent/builder/MemoryConfig';
import { RetrieverBuilder } from '@/components/poweragent/builder/RetrieverBuilder';
import { ConversationManager } from '@/components/poweragent/builder/ConversationManager';
import { VoiceConfig } from '@/components/poweragent/builder/VoiceConfig';
import { HooksEditor } from '@/components/poweragent/builder/HooksEditor';
import { EventMonitor } from '@/components/poweragent/builder/EventMonitor';
import { SubAgentManager } from '@/components/poweragent/builder/SubAgentManager';
import { AgentTester } from '@/components/poweragent/builder/AgentTester';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'built-in' | 'custom' | 'mcp';
  category?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
}

interface Toolkit {
  id: string;
  name: string;
  description: string;
  tools: string[]; // Tool IDs
  instructions?: string;
  addInstructions: boolean;
}

interface RetrieverConfig {
  name: string;
  description: string;
  type: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
  implementation: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    config?: Record<string, unknown>;
    description?: string;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: {
    label?: string;
  };
}

interface AgentConfig {
  name: string;
  purpose: string;
  description: string;
  provider: string;
  model: string;
  instructions: string;
  markdown: boolean;
  selectedTools: string[];
  customTools: Tool[];
  toolkits: Toolkit[];
  memory: Record<string, unknown> | null;
  retrievers: RetrieverConfig[];
  conversation: Record<string, unknown>;
  voice: Record<string, unknown> | null;
  hooks: Record<string, unknown>;
  subAgents: string[];
  workflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  delegationRules?: Record<string, string>;
  isSupervisor?: boolean;
}

export default function AgentBuilderPage() {
  const { user } = useGlobal();
  const { selectedBrand } = useBrand();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    purpose: '',
    description: '',
    provider: 'google-ai',
    model: 'gemini-2.5-pro-preview-06-05',
    instructions: '',
    markdown: true,
    selectedTools: [],
    customTools: [],
    toolkits: [],
    memory: null,
    retrievers: [],
    conversation: {},
    voice: null,
    hooks: {},
    subAgents: [],
    workflow: { nodes: [], edges: [] }
  });

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setAgentConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!selectedBrand) {
        throw new Error('No brand selected');
      }

      const response = await fetch('/api/poweragent/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: selectedBrand.id,
          ...agentConfig,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save agent');
      }

      const { agent } = await response.json();
      console.log('Agent saved successfully:', agent);
      
      router.push('/app/poweragent/agents');
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(`Failed to save agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/app/poweragent')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary" />
                Agent Builder
              </h1>
              <p className="text-gray-600 mt-2">
                Create and configure a new PowerAgent
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/poweragent')}>
              Cancel
            </Button>
            <Button 
              className="flex items-center gap-2" 
              onClick={handleSave}
              disabled={saving || !agentConfig.name}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Agent
            </Button>
          </div>
        </div>

        {/* Brand Context */}
        {selectedBrand && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Creating agent for <strong>{selectedBrand.name}</strong>. Your agent will be automatically associated with this brand and have access to brand-specific resources.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Getting Started Guide */}
      {!agentConfig.name && activeTab === 'basic' && (
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg">🚀 Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>Welcome to the PowerAgent Builder! Here&apos;s how to create your first agent:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li><strong>Basic Info:</strong> Start by naming your agent and defining its purpose</li>
                <li><strong>Tools:</strong> Add capabilities like web search, calculations, or API calls</li>
                <li><strong>Memory:</strong> Enable conversation history for contextual responses</li>
                <li><strong>Voice:</strong> Add text-to-speech for voice interactions (optional)</li>
                <li><strong>Hooks:</strong> Add custom logic for logging or monitoring (advanced)</li>
              </ol>
              <p className="mt-3 text-muted-foreground">
                💡 <strong>Tip:</strong> Start simple with just a name and instructions, then add features as needed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-8">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="hooks" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Hooks
          </TabsTrigger>
          <TabsTrigger value="subagents" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Sub-Agents
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test
          </TabsTrigger>
        </TabsList>

        {/* Basic Configuration Tab */}
        <TabsContent value="basic" className="space-y-6">
          <AgentBasicInfo 
            config={agentConfig}
            onUpdate={updateConfig}
          />
          
          <ProviderSelector
            provider={agentConfig.provider}
            model={agentConfig.model}
            onUpdate={updateConfig}
          />
          
          <InstructionsEditor
            instructions={agentConfig.instructions}
            markdown={agentConfig.markdown}
            onUpdate={updateConfig}
          />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <ToolsManager
            selectedTools={agentConfig.selectedTools}
            customTools={agentConfig.customTools}
            toolkits={agentConfig.toolkits}
            onUpdate={updateConfig}
          />
        </TabsContent>

        {/* Memory Tab */}
        <TabsContent value="memory" className="space-y-6">
          <MemoryConfig
            config={agentConfig.memory || {}}
            onChange={(memory) => updateConfig({ memory: memory as Record<string, unknown> })}
          />
          
          <RetrieverBuilder
            retrievers={agentConfig.retrievers || []}
            onChange={(retrievers) => updateConfig({ retrievers })}
          />
          
          <ConversationManager
            config={agentConfig.conversation || {}}
            onChange={(conversation) => updateConfig({ conversation: conversation as Record<string, unknown> })}
          />
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-6">
          <VoiceConfig
            config={agentConfig.voice || {}}
            onChange={(voice) => updateConfig({ voice: voice as Record<string, unknown> })}
          />
        </TabsContent>

        {/* Hooks Tab */}
        <TabsContent value="hooks" className="space-y-6">
          <HooksEditor
            hooks={agentConfig.hooks as Record<string, { name: string; enabled: boolean; code: string; description: string; }>}
            onChange={(hooks) => updateConfig({ hooks })}
          />
          
          <EventMonitor
            isLive={false}
            onClear={() => console.log('Clear events')}
          />
        </TabsContent>

        {/* Sub-Agents Tab */}
        <TabsContent value="subagents" className="space-y-6">
          <SubAgentManager
            selectedAgents={agentConfig.subAgents}
            delegationRules={agentConfig.delegationRules}
            onUpdate={(updates) => {
              if (updates.subAgents) {
                updateConfig({ subAgents: updates.subAgents });
              }
              if (updates.delegationRules) {
                updateConfig({ delegationRules: updates.delegationRules });
              }
            }}
          />
          
          {/* Workflow Designer */}
          {agentConfig.subAgents.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Workflow Designer
                </CardTitle>
                <CardDescription>
                  Design your supervisor&apos;s execution flow using n8n-style workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The workflow designer is integrated into the Sub-Agent Manager above. Use the visual workflow builder there to create complex decision flows and delegation patterns.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Workflow Designer
                </CardTitle>
                <CardDescription>
                  Design your supervisor&apos;s execution flow using n8n-style workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Sub-Agents Selected</h3>
                  <p className="text-sm mb-4">
                    Add sub-agents above to start designing workflows and delegation patterns.
                  </p>
                  <p className="text-xs text-gray-500">
                    The workflow designer allows you to create complex decision flows where the supervisor can delegate tasks to different agents based on conditions and logic.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6">
          <AgentTester 
            agentConfig={agentConfig} 
            brandId={selectedBrand?.id || ''} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 