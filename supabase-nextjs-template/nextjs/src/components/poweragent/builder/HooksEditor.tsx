'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Code2, Lightbulb, Play, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Hook {
  name: string;
  enabled: boolean;
  code: string;
  description: string;
}

interface HooksEditorProps {
  hooks: Record<string, Hook>;
  onChange: (hooks: Record<string, Hook>) => void;
}

const hookTemplates = {
  onStart: {
    logging: `async ({ agent, context }) => {
  console.log(\`Agent \${agent.name} starting operation \${context.operationId}\`);
  
  // Add request tracking
  context.userContext.set('requestId', \`req-\${Date.now()}\`);
  context.userContext.set('startTime', new Date().toISOString());
}`,
    metrics: `async ({ agent, context }) => {
  // Track operation start
  await trackMetric('agent.operation.start', {
    agentId: agent.id,
    agentName: agent.name,
    operationId: context.operationId,
    timestamp: Date.now()
  });
  
  // Set performance timer
  context.userContext.set('perfTimer', performance.now());
}`,
    validation: `async ({ agent, context }) => {
  // Validate agent configuration
  if (!agent.llm || !agent.model) {
    throw new Error('Agent is not properly configured');
  }
  
  // Check rate limits
  const userId = context.userContext.get('userId');
  if (userId && await isRateLimited(userId)) {
    throw new Error('Rate limit exceeded');
  }
}`
  },
  onEnd: {
    logging: `async ({ agent, output, error, messages, context }) => {
  const requestId = context.userContext.get('requestId');
  const startTime = context.userContext.get('startTime');
  
  if (error) {
    console.error(\`Agent \${agent.name} failed: \${error.message}\`);
    console.error('Error details:', error);
  } else {
    console.log(\`Agent \${agent.name} completed successfully\`);
    console.log('Output:', output);
  }
  
  console.log(\`Request \${requestId} duration: \${Date.now() - new Date(startTime).getTime()}ms\`);
}`,
    metrics: `async ({ agent, output, error, context }) => {
  const perfTimer = context.userContext.get('perfTimer');
  const duration = performance.now() - perfTimer;
  
  await trackMetric('agent.operation.end', {
    agentId: agent.id,
    agentName: agent.name,
    operationId: context.operationId,
    duration,
    success: !error,
    usage: output?.usage
  });
}`,
    storage: `async ({ agent, output, error, messages, context }) => {
  // Store conversation history
  if (!error && messages) {
    await storeConversation({
      agentId: agent.id,
      operationId: context.operationId,
      messages,
      usage: output?.usage,
      timestamp: new Date()
    });
  }
}`
  },
  onToolStart: {
    logging: `async ({ agent, tool, context }) => {
  console.log(\`Agent \${agent.name} invoking tool '\${tool.name}'\`);
  console.log('Tool parameters:', tool.parameters);
  
  // Track tool usage
  context.userContext.set(\`tool_\${tool.name}_start\`, Date.now());
}`,
    validation: `async ({ agent, tool, context }) => {
  // Validate tool permissions
  const userId = context.userContext.get('userId');
  if (!await hasToolPermission(userId, tool.name)) {
    throw new Error(\`User lacks permission for tool: \${tool.name}\`);
  }
  
  // Log tool intent
  console.log(\`Tool \${tool.name} starting for operation \${context.operationId}\`);
}`
  },
  onToolEnd: {
    logging: `async ({ agent, tool, output, error, context }) => {
  const startTime = context.userContext.get(\`tool_\${tool.name}_start\`);
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error(\`Tool \${tool.name} failed: \${error.message}\`);
  } else {
    console.log(\`Tool \${tool.name} completed in \${duration}ms\`);
    console.log('Tool output:', output);
  }
}`,
    metrics: `async ({ agent, tool, output, error, context }) => {
  await trackMetric('agent.tool.execution', {
    agentId: agent.id,
    toolName: tool.name,
    success: !error,
    operationId: context.operationId
  });
}`
  },
  onHandoff: {
    logging: `async ({ agent, sourceAgent }) => {
  console.log(\`Task handed off from \${sourceAgent.name} to \${agent.name}\`);
  console.log('Handoff timestamp:', new Date().toISOString());
}`,
    tracking: `async ({ agent, sourceAgent }) => {
  // Track agent collaboration
  await trackHandoff({
    sourceAgentId: sourceAgent.id,
    sourceAgentName: sourceAgent.name,
    targetAgentId: agent.id,
    targetAgentName: agent.name,
    timestamp: new Date()
  });
}`
  }
};

export function HooksEditor({ hooks, onChange }: HooksEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeHook, setActiveHook] = useState<string>('onStart');

  const hookDefinitions = {
    onStart: {
      name: 'onStart',
      description: 'Called before the agent starts processing a request',
      params: ['agent', 'context']
    },
    onEnd: {
      name: 'onEnd',
      description: 'Called after the agent finishes processing (success or error)',
      params: ['agent', 'output', 'error', 'messages', 'context']
    },
    onToolStart: {
      name: 'onToolStart',
      description: 'Called before a tool is executed',
      params: ['agent', 'tool', 'context']
    },
    onToolEnd: {
      name: 'onToolEnd',
      description: 'Called after a tool finishes execution',
      params: ['agent', 'tool', 'output', 'error', 'context']
    },
    onHandoff: {
      name: 'onHandoff',
      description: 'Called when a task is handed off between agents',
      params: ['agent', 'sourceAgent']
    }
  };

  const updateHook = (hookName: string, updates: Partial<Hook>) => {
    onChange({
      ...hooks,
      [hookName]: {
        ...hooks[hookName],
        ...updates
      }
    });
  };

  const applyTemplate = (hookName: string, templateName: string) => {
    const templates = hookTemplates[hookName as keyof typeof hookTemplates];
    if (templates && templates[templateName as keyof typeof templates]) {
      updateHook(hookName, {
        code: templates[templateName as keyof typeof templates]
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          Hooks Configuration
        </CardTitle>
        <CardDescription>
          Add custom logic at key points in your agent&apos;s lifecycle. Hooks enable logging, monitoring, validation, and advanced control over agent behavior.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeHook} onValueChange={setActiveHook}>
          <TabsList className="grid grid-cols-5 w-full">
            {Object.keys(hookDefinitions).map((hookName) => (
              <TabsTrigger key={hookName} value={hookName} className="text-xs">
                {hookName}
                {hooks[hookName]?.enabled && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    ✓
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(hookDefinitions).map(([hookName, hookDef]) => (
            <TabsContent key={hookName} value={hookName} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{hookDef.name}</h3>
                    <p className="text-sm text-muted-foreground">{hookDef.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Parameters:
                      </Badge>
                      {hookDef.params.map((param) => (
                        <Badge key={param} variant="secondary" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${hookName}-enabled`}>Enabled</Label>
                    <Switch
                      id={`${hookName}-enabled`}
                      checked={hooks[hookName]?.enabled || false}
                      onCheckedChange={(checked) => updateHook(hookName, { enabled: checked })}
                    />
                  </div>
                </div>

                {hooks[hookName]?.enabled && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Hook Template</Label>
                        <Select
                          value={selectedTemplate}
                          onValueChange={(value) => {
                            setSelectedTemplate(value);
                            applyTemplate(hookName, value);
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(hookTemplates[hookName as keyof typeof hookTemplates] || {}).map((template) => (
                              <SelectItem key={template} value={template}>
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-3 w-3" />
                                  {template.charAt(0).toUpperCase() + template.slice(1)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Hook Function</Label>
                      <div className="relative">
                        <Textarea
                          value={hooks[hookName]?.code || ''}
                          onChange={(e) => updateHook(hookName, { code: e.target.value })}
                          placeholder={`async ({ ${hookDef.params.join(', ')} }) => {\n  // Your hook logic here\n}`}
                          className="font-mono text-sm min-h-[300px]"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            // Validate hook syntax (basic check)
                            try {
                              new Function(`return ${hooks[hookName]?.code || '() => {}'}`)();
                              alert('Hook syntax is valid!');
                            } catch (error) {
                              alert(`Syntax error: ${error}`);
                            }
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Validate
                        </Button>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Pro Tips:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Hooks run asynchronously - use <code>async/await</code> for API calls</li>
                          <li>Share data between hooks using <code>context.userContext.set(key, value)</code></li>
                          <li>Access agent config with <code>agent.name</code>, <code>agent.model</code>, etc.</li>
                          <li>Tool hooks receive tool parameters and results for inspection</li>
                          <li>Return early from hooks to avoid blocking agent execution</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
} 