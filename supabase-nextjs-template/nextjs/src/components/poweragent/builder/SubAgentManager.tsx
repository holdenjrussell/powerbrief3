'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  Plus, 
  Search, 
  Bot, 
  ChevronRight,
  Users,
  Trash2,
  Edit,
  Sparkles,
  Brain,
  Globe,
  FileText,
  Wrench,
  MessageSquare,
  Code,
  Info,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Zap
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateSubAgentDialog } from './CreateSubAgentDialog';

interface Agent {
  id: string;
  name: string;
  purpose: string;
  description?: string;
  type?: string;
  capabilities?: string[];
}

interface SubAgentManagerProps {
  selectedAgents: string[];
  availableAgents?: Agent[];
  delegationRules?: Record<string, string>;
  onUpdate: (updates: {
    subAgents?: string[];
    delegationRules?: Record<string, string>;
  }) => void;
}

// Mock available agents for demonstration
const mockAvailableAgents: Agent[] = [
  {
    id: 'research-agent',
    name: 'Research Agent',
    purpose: 'Gathers information from various sources',
    description: 'Specializes in web search, data collection, and fact-checking',
    type: 'research',
    capabilities: ['Web Search', 'Data Analysis', 'Fact Checking']
  },
  {
    id: 'writer-agent',
    name: 'Content Writer',
    purpose: 'Creates written content in various formats',
    description: 'Expert in blog posts, articles, and creative writing',
    type: 'creative',
    capabilities: ['Blog Writing', 'Copywriting', 'Creative Writing']
  },
  {
    id: 'analyst-agent',
    name: 'Data Analyst',
    purpose: 'Analyzes data and generates insights',
    description: 'Processes data, creates visualizations, and provides insights',
    type: 'analytical',
    capabilities: ['Data Processing', 'Statistical Analysis', 'Reporting']
  },
  {
    id: 'translator-agent',
    name: 'Language Translator',
    purpose: 'Translates content between languages',
    description: 'Accurate translation with cultural context awareness',
    type: 'language',
    capabilities: ['Translation', 'Localization', 'Cultural Adaptation']
  }
];

export function SubAgentManager({ 
  selectedAgents = [], 
  availableAgents = mockAvailableAgents,
  delegationRules = {},
  onUpdate 
}: SubAgentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleText, setRuleText] = useState('');
  const [customAgents, setCustomAgents] = useState<Agent[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const allAvailableAgents = [...availableAgents, ...customAgents];
  
  const filteredAgents = allAvailableAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAgentDetails = selectedAgents
    .map(id => allAvailableAgents.find(a => a.id === id))
    .filter(Boolean) as Agent[];

  const handleAddAgent = (agentId: string) => {
    if (!selectedAgents.includes(agentId)) {
      onUpdate({ 
        subAgents: [...selectedAgents, agentId] 
      });
    }
    setShowAddDialog(false);
  };

  const handleRemoveAgent = (agentId: string) => {
    onUpdate({ 
      subAgents: selectedAgents.filter(id => id !== agentId),
      delegationRules: Object.fromEntries(
        Object.entries(delegationRules).filter(([key]) => key !== agentId)
      )
    });
  };

  const handleUpdateRule = (agentId: string, rule: string) => {
    onUpdate({
      delegationRules: {
        ...delegationRules,
        [agentId]: rule
      }
    });
    setEditingRule(null);
    setRuleText('');
  };

  const getAgentIcon = (type?: string) => {
    switch (type) {
      case 'research': return <Globe className="h-4 w-4" />;
      case 'creative': return <Sparkles className="h-4 w-4" />;
      case 'analytical': return <Brain className="h-4 w-4" />;
      case 'language': return <FileText className="h-4 w-4" />;
      case 'technical': return <Code className="h-4 w-4" />;
      case 'customer': return <MessageSquare className="h-4 w-4" />;
      case 'general': return <Wrench className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const handleCreateAgent = (newAgent: {
    name: string;
    purpose: string;
    description: string;
    type: string;
    capabilities: string[];
  }) => {
    const agent: Agent = {
      id: `custom_${Date.now()}`,
      name: newAgent.name,
      purpose: newAgent.purpose,
      description: newAgent.description,
      type: newAgent.type,
      capabilities: newAgent.capabilities
    };
    setCustomAgents([...customAgents, agent]);
  };

  return (
    <div className="space-y-6">
      {/* Getting Started Guide */}
      {selectedAgentDetails.length === 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Getting Started with Sub-Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Add Sub-Agents</h4>
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Add Existing&quot; to choose from pre-built agents or &quot;Create New&quot; to build custom ones
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Define When to Delegate</h4>
                  <p className="text-sm text-muted-foreground">
                    Set rules for each sub-agent to tell the supervisor when to use them
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 rounded-full bg-blue-100 text-blue-600">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Design Workflow (Optional)</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the workflow designer to create complex decision flows
                  </p>
                </div>
              </div>
            </div>
            
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro Tip:</strong> Start with 2-3 specialized agents. The supervisor will automatically coordinate between them based on the user&apos;s request.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Sub-Agent Team Builder
          </CardTitle>
          <CardDescription>
            Transform this agent into a powerful supervisor that manages a team of specialized agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Manage Agents</TabsTrigger>
              <TabsTrigger value="rules">Delegation Rules</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>How Supervisor Agents Work</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>When you add sub-agents, this agent becomes a <strong>Supervisor</strong> that:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Automatically gets a <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">delegate_task</code> tool</li>
                    <li>Analyzes user requests and decides which sub-agent to use</li>
                    <li>Can delegate to multiple agents for complex tasks</li>
                    <li>Combines results into a cohesive response</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {selectedAgentDetails.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Your Agent Team</h3>
                    <Badge variant="secondary">
                      {selectedAgentDetails.length} Sub-Agent{selectedAgentDetails.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {/* Visual Team Overview */}
                  <div className="p-6 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-sm">
                          <Bot className="h-5 w-5" />
                          <span className="font-medium">Supervisor Agent</span>
                        </div>
                        <div className="mt-4 flex justify-center">
                          <ChevronRight className="h-6 w-6 text-muted-foreground rotate-90" />
                        </div>
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                          {selectedAgentDetails.map((agent) => (
                            <div
                              key={agent.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg shadow-sm"
                            >
                              {getAgentIcon(agent.type)}
                              <span className="text-sm font-medium">{agent.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setActiveTab('agents')}
                      className="flex-1"
                    >
                      Manage Team
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab('rules')}
                      className="flex-1"
                    >
                      Configure Rules
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No Sub-Agents Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add sub-agents to create a powerful team of AI specialists
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Existing Agent
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create New Agent
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Team Members</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Existing
                  </Button>
                </div>
              </div>

              {selectedAgentDetails.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No agents in your team yet. Add agents to enable supervisor capabilities.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {selectedAgentDetails.map((agent) => (
                    <Card key={agent.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded-lg bg-gray-100">
                              {getAgentIcon(agent.type)}
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {agent.purpose}
                              </p>
                              {agent.capabilities && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {agent.capabilities.map((cap) => (
                                    <Badge key={cap} variant="secondary" className="text-xs">
                                      {cap}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAgent(agent.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-4">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Delegation Rules</AlertTitle>
                <AlertDescription>
                  Define when the supervisor should delegate tasks to each sub-agent. Be specific about the types of requests each agent should handle.
                </AlertDescription>
              </Alert>

              {selectedAgentDetails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>Add sub-agents first to configure delegation rules</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAgentDetails.map((agent) => (
                    <Card key={agent.id}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {getAgentIcon(agent.type)}
                          {agent.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label>When should tasks be delegated to {agent.name}?</Label>
                          {editingRule === agent.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={ruleText}
                                onChange={(e) => setRuleText(e.target.value)}
                                placeholder={`Example: "When the user asks for ${agent.type === 'research' ? 'research, data gathering, or fact-checking' : agent.type === 'creative' ? 'content creation, writing, or creative tasks' : agent.type === 'analytical' ? 'data analysis, statistics, or insights' : 'translation or language-related tasks'}"`}
                                rows={3}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateRule(agent.id, ruleText)}
                                >
                                  Save Rule
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingRule(null);
                                    setRuleText('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm">
                                  {delegationRules[agent.id] || 
                                    <span className="text-muted-foreground italic">
                                      No specific rule set - supervisor will decide based on agent&apos;s purpose
                                    </span>
                                  }
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingRule(agent.id);
                                  setRuleText(delegationRules[agent.id] || '');
                                }}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                {delegationRules[agent.id] ? 'Edit Rule' : 'Add Rule'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Message */}
      {selectedAgentDetails.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Supervisor Mode Active!</AlertTitle>
          <AlertDescription>
            This agent now has the <code className="text-xs bg-green-100 px-1 py-0.5 rounded">delegate_task</code> tool and can coordinate between {selectedAgentDetails.length} sub-agent{selectedAgentDetails.length !== 1 ? 's' : ''}.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Agent Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Sub-Agent to Team</DialogTitle>
            <DialogDescription>
              Select an agent to add to your supervisor&apos;s team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <div
                      key={agent.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-muted border-primary opacity-50 cursor-not-allowed' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isSelected && handleAddAgent(agent.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getAgentIcon(agent.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{agent.name}</h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                Already Added
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agent.purpose}
                          </p>
                          {agent.capabilities && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {agent.capabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sub-Agent Dialog */}
      <CreateSubAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
} 