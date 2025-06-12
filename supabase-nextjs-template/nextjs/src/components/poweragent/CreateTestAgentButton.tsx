'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, CheckCircle2, XCircle } from 'lucide-react';
import { useBrand } from '@/lib/context/BrandContext';

export function CreateTestAgentButton() {
  const { selectedBrand } = useBrand();
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; agentId?: string } | null>(null);

  const createTestAgent = async () => {
    if (!selectedBrand) {
      setResult({ success: false, message: 'Please select a brand first' });
      return;
    }

    setCreating(true);
    setResult(null);

    try {
      // Comprehensive test agent configuration
      const testAgentConfig = {
        name: 'VoltAgent Test Assistant',
        purpose: 'A comprehensive test agent to verify all VoltAgent features',
        description: 'This agent tests all PowerAgent features including tools, memory, voice, hooks, and sub-agents',
        provider: 'vercel-ai',
        model: 'gpt-4o',
        instructions: `You are a comprehensive test assistant designed to showcase all VoltAgent capabilities.

Your primary responsibilities:
1. Demonstrate tool usage (reasoning, search, calculator, text analysis, JSON formatting)
2. Maintain conversation context using memory
3. Show voice capabilities when requested
4. Execute hooks for logging and monitoring
5. Coordinate with sub-agents when complex tasks are presented

Always be helpful, informative, and showcase your capabilities when appropriate.
When asked about your features, explain what you can do with specific examples.`,
        markdown: true,
        selectedTools: ['reasoning', 'search', 'calculator', 'text_analyzer', 'json_formatter'],
        customTools: [
          {
            id: 'custom_weather',
            name: 'get_weather',
            description: 'Get current weather for a location (mock data for testing)',
            type: 'custom',
            category: 'Information',
            enabled: true,
            parameters: {
              location: {
                type: 'string',
                description: 'City name or location'
              }
            },
            execute_code: `
// Mock weather data for testing
const weatherData = {
  'New York': { temp: 72, condition: 'Sunny', humidity: 65 },
  'London': { temp: 59, condition: 'Cloudy', humidity: 78 },
  'Tokyo': { temp: 68, condition: 'Clear', humidity: 70 },
  'Sydney': { temp: 75, condition: 'Partly Cloudy', humidity: 68 }
};

const location = params.location;
const data = weatherData[location] || { temp: 70, condition: 'Unknown', humidity: 50 };

return {
  location,
  temperature: data.temp,
  condition: data.condition,
  humidity: data.humidity,
  unit: 'Fahrenheit',
  timestamp: new Date().toISOString()
};`
          }
        ],
        toolkits: [
          {
            id: 'data_toolkit',
            name: 'Data Processing Toolkit',
            description: 'Tools for processing and analyzing data',
            tools: ['text_analyzer', 'json_formatter'],
            instructions: 'Use these tools together for comprehensive data analysis. Always analyze text before formatting results as JSON.',
            addInstructions: true
          }
        ],
        memory: {
          enabled: true,
          provider: 'supabase',
          config: {
            tableName: 'poweragent_memory',
            maxMessages: 100,
            ttl: 86400 // 24 hours
          }
        },
        retrievers: [
          {
            name: 'knowledge_base',
            description: 'Retrieves information from the knowledge base',
            type: 'simple',
            fields: [
              {
                id: 'query',
                name: 'query',
                type: 'string',
                description: 'Search query',
                required: true
              }
            ],
            implementation: `
// Simple knowledge base retriever
const knowledgeBase = [
  { topic: 'VoltAgent', content: 'VoltAgent is a powerful framework for building AI agents with TypeScript.' },
  { topic: 'PowerAgent', content: 'PowerAgent is a visual builder for creating and managing VoltAgent instances.' },
  { topic: 'Features', content: 'Key features include: multi-provider support, tools, memory, voice, hooks, and sub-agents.' }
];

const query = input.toLowerCase();
const results = knowledgeBase.filter(item => 
  item.topic.toLowerCase().includes(query) || 
  item.content.toLowerCase().includes(query)
);

return results.map(r => \`\${r.topic}: \${r.content}\`).join('\\n') || 'No relevant information found.';`
          }
        ],
        conversation: {
          contextLimit: 10,
          systemPromptBehavior: 'replace',
          messageFormatting: 'markdown',
          contextWindowStrategy: 'sliding'
        },
        voice: {
          enabled: true,
          provider: 'openai',
          ttsModel: 'tts-1',
          voice: 'alloy',
          speed: 1.0,
          language: 'en'
        },
        hooks: {
          onStart: {
            name: 'onStart',
            enabled: true,
            code: `console.log(\`[Agent Start] Session: \${context.operationId}, Time: \${new Date().toISOString()}\`);`,
            description: 'Logs when the agent starts processing'
          },
          onEnd: {
            name: 'onEnd',
            enabled: true,
            code: `
const duration = Date.now() - context.startTime;
console.log(\`[Agent End] Session: \${context.operationId}, Duration: \${duration}ms\`);
if (output?.usage) {
  console.log(\`[Token Usage] Total: \${output.usage.totalTokens}\`);
}`,
            description: 'Logs completion and token usage'
          },
          onToolStart: {
            name: 'onToolStart',
            enabled: true,
            code: `console.log(\`[Tool Start] \${tool.name} - \${JSON.stringify(tool.args)}\`);`,
            description: 'Logs tool execution start'
          },
          onToolEnd: {
            name: 'onToolEnd',
            enabled: true,
            code: `console.log(\`[Tool End] \${tool.name} - Success: \${!error}\`);`,
            description: 'Logs tool execution results'
          }
        },
        subAgents: [],
        delegationRules: {},
        isSupervisor: false
      };

      const response = await fetch('/api/poweragent/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_id: selectedBrand.id,
          ...testAgentConfig,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test agent');
      }

      setResult({
        success: true,
        message: 'Test agent created successfully!',
        agentId: data.agent.id
      });

    } catch (error) {
      console.error('Error creating test agent:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create test agent'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={createTestAgent}
        disabled={creating || !selectedBrand}
        className="w-full"
        size="lg"
      >
        {creating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Test Agent...
          </>
        ) : (
          <>
            <TestTube className="mr-2 h-4 w-4" />
            Create Test Agent with All Features
          </>
        )}
      </Button>

      {result && (
        <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            {result.message}
            {result.agentId && (
              <div className="mt-2">
                <strong>Agent ID:</strong> {result.agentId}
                <div className="mt-2 text-sm">
                  <strong>Test Prompts:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>&quot;What features do you have?&quot;</li>
                    <li>&quot;Calculate 25 * 4 + 10&quot;</li>
                    <li>&quot;Search for information about TypeScript&quot;</li>
                    <li>&quot;What&apos;s the weather in New York?&quot;</li>
                    <li>&quot;Analyze this text: VoltAgent is amazing!&quot;</li>
                  </ul>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 