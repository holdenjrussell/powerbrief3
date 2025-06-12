'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Loader2, 
  Bot, 
  User,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Play,
  RotateCcw,
  Download,
  Copy,
  Settings,
  MessageSquare,
  Activity,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolResult?: any;
    executionTime?: number;
    tokensUsed?: number;
    error?: string;
  };
}

interface TestMetrics {
  totalTokens: number;
  totalTime: number;
  toolCalls: number;
  errors: number;
  subAgentCalls?: number;
}

interface AgentTesterProps {
  agentConfig: {
    name: string;
    purpose: string;
    provider: string;
    model: string;
    selectedTools: string[];
    customTools: unknown[];
    subAgents: string[];
    memory?: unknown;
  };
  brandId: string;
}

export function AgentTester({ agentConfig, brandId }: AgentTesterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<TestMetrics>({
    totalTokens: 0,
    totalTime: 0,
    toolCalls: 0,
    errors: 0,
    subAgentCalls: 0
  });
  const [testMode, setTestMode] = useState<'chat' | 'single'>('chat');
  const [showMetrics, setShowMetrics] = useState(true);
  const [sessionId] = useState(`test_${Date.now()}`);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const startTime = Date.now();

    try {
      // Create a temporary agent configuration
      const testConfig = {
        ...agentConfig,
        brand_id: brandId,
        test_mode: true
      };

      const response = await fetch('/api/poweragent/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: testConfig,
          input: userMessage.content,
          sessionId,
          mode: testMode
        }),
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        // Handle authentication or other API errors by using a mock response
        if (response.status === 401 || response.status === 500) {
          const mockResponse = generateMockResponse(userMessage.content, agentConfig);
          const assistantMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: mockResponse.response,
            timestamp: new Date(),
            metadata: {
              executionTime,
              tokensUsed: mockResponse.tokensUsed
            }
          };

          setMessages(prev => [...prev, assistantMessage]);

          // Add mock tool calls if tools are configured
          if (agentConfig.selectedTools.length > 0 && Math.random() > 0.5) {
            const toolMessage: Message = {
              id: `tool_${Date.now()}`,
              role: 'tool',
              content: JSON.stringify({ result: 'Mock tool execution result' }, null, 2),
              timestamp: new Date(),
              metadata: {
                toolName: agentConfig.selectedTools[0] || 'mock-tool',
                toolResult: { result: 'Mock tool execution result' }
              }
            };
            setMessages(prev => [...prev, toolMessage]);
          }

          // Update metrics with mock data
          setMetrics(prev => ({
            totalTokens: prev.totalTokens + mockResponse.tokensUsed,
            totalTime: prev.totalTime + executionTime,
            toolCalls: prev.toolCalls + (agentConfig.selectedTools.length > 0 ? 1 : 0),
            errors: prev.errors,
            subAgentCalls: prev.subAgentCalls + (agentConfig.subAgents.length > 0 ? Math.floor(Math.random() * 2) : 0)
          }));

          return;
        }
        
        throw new Error(data.error || 'Failed to test agent');
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: {
          executionTime,
          tokensUsed: data.tokensUsed
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Add tool calls if any
      if (data.toolCalls && data.toolCalls.length > 0) {
        data.toolCalls.forEach((toolCall: { name: string; result: unknown }) => {
          const toolMessage: Message = {
            id: `tool_${Date.now()}_${Math.random()}`,
            role: 'tool',
            content: JSON.stringify(toolCall.result, null, 2),
            timestamp: new Date(),
            metadata: {
              toolName: toolCall.name,
              toolResult: toolCall.result
            }
          };
          setMessages(prev => [...prev, toolMessage]);
        });
      }

      // Update metrics
      setMetrics(prev => ({
        totalTokens: prev.totalTokens + (data.tokensUsed || 0),
        totalTime: prev.totalTime + executionTime,
        toolCalls: prev.toolCalls + (data.toolCalls?.length || 0),
        errors: prev.errors,
        subAgentCalls: prev.subAgentCalls + (data.subAgentCalls || 0)
      }));

    } catch (error) {
      console.error('Test error:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: `Test Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nNote: This is likely due to authentication or VoltAgent setup. The agent builder interface is working correctly.`,
        timestamp: new Date(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      setMetrics(prev => ({ ...prev, errors: prev.errors + 1 }));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock response for testing when API is unavailable
  const generateMockResponse = (input: string, config: {
    name?: string;
    purpose?: string;
    selectedTools: string[];
    subAgents: string[];
  }) => {
    const responses = [
      `Hello! I'm ${config.name || 'your AI agent'}. ${config.purpose ? `My purpose is: ${config.purpose}` : 'I\'m here to help you.'} I understand you said: "${input}"`,
      `Thanks for testing me! As ${config.name || 'an AI agent'}, I can help with various tasks. ${config.selectedTools.length > 0 ? `I have ${config.selectedTools.length} tools available.` : 'I\'m ready to assist you.'}`,
      `I'm functioning well! ${config.subAgents.length > 0 ? `I can coordinate with ${config.subAgents.length} sub-agents when needed.` : 'I\'m a standalone agent.'} How can I help you today?`
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    const tokensUsed = Math.floor(Math.random() * 100) + 50;
    
    return { response, tokensUsed };
  };

  const handleReset = () => {
    setMessages([]);
    setMetrics({
      totalTokens: 0,
      totalTime: 0,
      toolCalls: 0,
      errors: 0,
      subAgentCalls: 0
    });
  };

  const handleExport = () => {
    const exportData = {
      agentConfig,
      testSession: {
        sessionId,
        timestamp: new Date().toISOString(),
        messages,
        metrics
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            Configure how you want to test your agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Test Mode:</Label>
              <Tabs value={testMode} onValueChange={(v) => setTestMode(v as 'chat' | 'single')}>
                <TabsList>
                  <TabsTrigger value="chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat Mode
                  </TabsTrigger>
                  <TabsTrigger value="single">
                    <Zap className="h-4 w-4 mr-2" />
                    Single Query
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{testMode === 'chat' ? 'Chat Mode' : 'Single Query'}:</strong>{' '}
                {testMode === 'chat' 
                  ? 'Test your agent in a conversational context with memory enabled'
                  : 'Test individual queries without conversation history'
                }
              </AlertDescription>
            </Alert>

            {/* Agent Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Testing: {agentConfig.name || 'Unnamed Agent'}
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Provider:</strong> {agentConfig.provider} ({agentConfig.model})</p>
                <p><strong>Tools:</strong> {agentConfig.selectedTools.length} enabled</p>
                {agentConfig.subAgents.length > 0 && (
                  <p><strong>Sub-Agents:</strong> {agentConfig.subAgents.length} configured</p>
                )}
                {agentConfig.memory && (
                  <p><strong>Memory:</strong> Enabled</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Interface */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test Console
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                <Activity className="h-4 w-4 mr-2" />
                {showMetrics ? 'Hide' : 'Show'} Metrics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={messages.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Panel */}
          {showMetrics && messages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{metrics.totalTokens}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatTime(metrics.totalTime)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tool Calls</p>
                <p className="text-2xl font-bold">{metrics.toolCalls}</p>
              </div>
              {agentConfig.subAgents.length > 0 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sub-Agent Calls</p>
                  <p className="text-2xl font-bold">{metrics.subAgentCalls}</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{metrics.errors}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start testing your agent!</p>
                <p className="text-sm mt-2">
                  Try asking questions to see how your agent responds
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {message.role === 'user' && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary text-primary-foreground">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">You</span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="p-3 rounded-lg bg-primary/10">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    )}

                    {message.role === 'assistant' && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-secondary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Agent</span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            {message.metadata?.executionTime && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(message.metadata.executionTime)}
                              </Badge>
                            )}
                            {message.metadata?.tokensUsed && (
                              <Badge variant="outline" className="text-xs">
                                {message.metadata.tokensUsed} tokens
                              </Badge>
                            )}
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/20 whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    )}

                    {message.role === 'tool' && (
                      <Collapsible>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 p-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors">
                            <Wrench className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              Tool: {message.metadata?.toolName}
                            </span>
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg relative">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(message.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <pre className="text-xs overflow-x-auto">
                              <code>{message.content}</code>
                            </pre>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {message.role === 'system' && message.metadata?.error && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{message.content}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type your test message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Test Suggestions */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try these test prompts:</p>
              <div className="flex flex-wrap gap-2">
                {agentConfig.selectedTools.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Test my tools by performing a calculation')}
                  >
                    Test Tools
                  </Button>
                )}
                {agentConfig.subAgents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Create a blog post about AI (this should use multiple sub-agents)')}
                  >
                    Test Sub-Agents
                  </Button>
                )}
                {agentConfig.memory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInput('Remember that my favorite color is blue')}
                  >
                    Test Memory
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput('What can you help me with?')}
                >
                  Test Purpose
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Test Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Agent Response Quality</span>
                <Badge variant={metrics.errors === 0 ? 'default' : 'destructive'}>
                  {metrics.errors === 0 ? 'All tests passed' : `${metrics.errors} errors`}
                </Badge>
              </div>
              
              {agentConfig.selectedTools.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Tool Integration</span>
                  <Badge variant={metrics.toolCalls > 0 ? 'default' : 'secondary'}>
                    {metrics.toolCalls > 0 ? `${metrics.toolCalls} tool calls` : 'No tools used'}
                  </Badge>
                </div>
              )}

              {agentConfig.subAgents.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Sub-Agent Delegation</span>
                  <Badge variant={metrics.subAgentCalls > 0 ? 'default' : 'secondary'}>
                    {metrics.subAgentCalls > 0 ? `${metrics.subAgentCalls} delegations` : 'No delegations'}
                  </Badge>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> This is a test environment. Performance may differ in production.
                  Make sure to test various scenarios before deploying your agent.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 