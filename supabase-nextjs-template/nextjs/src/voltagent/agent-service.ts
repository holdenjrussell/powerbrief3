import { Agent, createTool, createReasoningTools, createHooks, Tool, Toolkit } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { GoogleGenAIProvider } from '@voltagent/google-ai';
import { GroqProvider } from '@voltagent/groq-ai';
import { AnthropicProvider } from '@voltagent/anthropic-ai';
import { XSAIProvider } from '@voltagent/xsai';
import { SupabaseMemory } from '@voltagent/supabase';
import { OpenAIVoiceProvider, ElevenLabsVoiceProvider } from '@voltagent/voice';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import type { Tables } from '@/lib/database.types';
import { registerWithVoltAgent } from './index';
import { AgentRegistry } from './agent-registry';

// Agent configuration type
type PowerAgentConfig = Tables<'poweragent_agents'> & {
  selectedTools: string[];
  customTools: Array<{
    id: string;
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute_code: string;
  }>;
  toolkits: Array<{
    id: string;
    name: string;
    description: string;
    tools: string[];
    instructions?: string;
  }>;
  memory: Record<string, unknown> | null;
  conversation: Record<string, unknown>;
  voice: Record<string, unknown> | null;
  hooks: Record<string, unknown>;
  subAgents: string[];
  delegationRules?: Record<string, string>;
};

export class PowerAgentService {
  private registry: AgentRegistry;

  constructor() {
    this.registry = AgentRegistry.getInstance();
    this.createMockSubAgents();
  }

  private createMockSubAgents() {
    // Create mock sub-agents for demonstration purposes
    const mockAgents = [
      {
        id: 'writer-agent',
        name: 'Creative Writer',
        instructions: 'You are a creative writer specializing in compelling stories and content.',
        provider: 'google-ai',
        model: 'gemini-2.5-pro-preview-06-05'
      },
      {
        id: 'research-agent', 
        name: 'Research Assistant',
        instructions: 'You are a research assistant that gathers and analyzes information.',
        provider: 'google-ai',
        model: 'gemini-2.5-pro-preview-06-05'
      },
      {
        id: 'analyst-agent',
        name: 'Data Analyst', 
        instructions: 'You are a data analyst that processes and interprets data.',
        provider: 'google-ai',
        model: 'gemini-2.5-pro-preview-06-05'
      },
      {
        id: 'translator-agent',
        name: 'Translator',
        instructions: 'You are a professional translator for multiple languages.',
        provider: 'google-ai',
        model: 'gemini-2.5-pro-preview-06-05'
      }
    ];

    for (const mockConfig of mockAgents) {
      if (!this.registry.getAgent(mockConfig.id)) {
        try {
          const llmProvider = this.createProvider(mockConfig.provider);
          const model = this.createModel(mockConfig.provider, mockConfig.model);
          
          // Create simple agents without tools for basic functionality
          const agent = new Agent({
            name: mockConfig.name,
            instructions: mockConfig.instructions,
            llm: llmProvider,
            model
          });

          this.registry.registerAgent(mockConfig.id, agent, mockConfig.name);
          console.log(`[PowerAgentService] Created mock agent: ${mockConfig.id}`);
        } catch (error) {
          console.warn(`Failed to create mock agent ${mockConfig.id}:`, error);
        }
      }
    }
  }

  async createAgent(config: PowerAgentConfig): Promise<Agent> {
    try {
      console.log(`[PowerAgentService] Creating agent: ${config.name} (ID: ${config.id})`);
      
      // Create provider
      const llmProvider = this.createProvider(config.provider, config.brand_id);
      
      // Create model (format depends on provider)
      const model = this.createModel(config.provider, config.model);
      
      // Create memory provider if configured
      let memory: SupabaseMemory | undefined;
      if (config.memory && config.memory.enabled) {
        memory = this.createMemoryProvider(config.brand_id);
      }
      
      // Create voice provider if configured
      let voice: OpenAIVoiceProvider | ElevenLabsVoiceProvider | undefined;
      if (config.voice && config.voice.enabled) {
        voice = await this.createVoiceProvider(config.voice as Record<string, unknown>, config.brand_id);
      }
      
      // Create hooks if configured
      let hooks: Hooks | undefined;
      if (config.hooks) {
        hooks = this.createHooks(config.hooks);
      }
      
      // Create tools
      const tools = await this.createTools(
        config.selectedTools || [],
        config.customTools || [],
        config.provider
      );
      
      // Add toolkits
      for (const toolkit of config.toolkits || []) {
        try {
          // Create tools for this toolkit
          const toolkitTools = await Promise.all(
            toolkit.tools.map(async (toolId) => {
              return await this.createBuiltInTool(toolId);
            })
          );
          
          // Filter out null values
          const validTools = toolkitTools.filter(Boolean) as Tool[];
          
          if (validTools.length > 0) {
            // Add toolkit to tools list
            tools.push({
              name: toolkit.name,
              description: toolkit.description,
              tools: validTools,
              instructions: toolkit.instructions,
              addInstructions: true
            } as Toolkit);
            
            console.log(`[PowerAgentService] Added toolkit: ${toolkit.name} with ${validTools.length} tools`);
          }
        } catch (error) {
          console.warn(`Failed to create toolkit ${toolkit.name}:`, error);
        }
      }
      
      // Get or create sub-agents
      const subAgents: Agent[] = [];
      const subAgentIds = config.subAgents || [];
      const supervisorId = config.id;
      
      // Get or create sub-agents
      for (const subAgentId of subAgentIds) {
        const subAgent = this.registry.getAgent(subAgentId);
        
        if (!subAgent) {
          console.warn(`Sub-agent ${subAgentId} not found in registry. Available agents:`, this.registry.listAgentIds());
          // TODO: Load sub-agent from database and create it recursively
          continue;
        }

        subAgents.push(subAgent);
        this.registry.registerRelationship(supervisorId, subAgentId);
      }

      // Create the agent with proper configuration
      const agentConfig: {
        name: string;
        instructions: string;
        llm: VercelAIProvider | GoogleGenAIProvider | GroqProvider | AnthropicProvider | XSAIProvider;
        model: unknown;
        memory?: SupabaseMemory;
        voice?: OpenAIVoiceProvider | ElevenLabsVoiceProvider;
        hooks?: Record<string, Function>;
        tools?: (Tool | Toolkit)[];
        subAgents?: Agent[];
        markdown?: boolean;
      } = {
        name: config.name,
        instructions: config.instructions,
        llm: llmProvider,
        model,
        memory,
        voice,
        hooks
      };

      // Add markdown configuration if specified
      if (config.config && typeof config.config === 'object' && 'markdown' in config.config) {
        agentConfig.markdown = config.config.markdown as boolean;
      }

      // Add tools if any
      if (tools.length > 0) {
        agentConfig.tools = tools;
      }

      // Add sub-agents if any
      if (subAgents.length > 0) {
        agentConfig.subAgents = subAgents;
      }

      const agent = new Agent(agentConfig);

      // Register the agent with our local registry
      this.registry.registerAgent(config.id, agent, config.name);
      
      // Also register with VoltAgent's registry to avoid "Agent not found" warnings
      try {
        registerWithVoltAgent(agent);
      } catch (error) {
        console.warn(`Failed to register agent with VoltAgent:`, error);
      }

      console.log(`[PowerAgentService] Successfully created agent: ${config.name}`);
      return agent;
    } catch (error) {
      console.error('Error creating PowerAgent:', error);
      throw error;
    }
  }

  private createProvider(provider: string, brandId?: string) {
    // brandId will be used in future to fetch brand-specific API keys
    void brandId; // Suppress unused parameter warning
    
    switch (provider) {
      case 'vercel-ai':
        return new VercelAIProvider();
      case 'google-ai':
        const googleApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!googleApiKey) {
          console.warn('Google AI API key not found, falling back to VercelAI provider');
          return new VercelAIProvider();
        }
        return new GoogleGenAIProvider({
          apiKey: googleApiKey
        });
      case 'groq-ai':
        return new GroqProvider({
          apiKey: process.env.GROQ_API_KEY || ''
        });
      case 'anthropic-ai':
        return new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY || ''
        });
      case 'xsai':
        return new XSAIProvider({
          apiKey: process.env.OPENAI_API_KEY || '',
          baseURL: process.env.XSAI_BASE_URL
        });
      default:
        console.warn(`Unknown provider: ${provider}, using VercelAI as fallback`);
        return new VercelAIProvider();
    }
  }

  private createModel(provider: string, modelName: string) {
    switch (provider) {
      case 'vercel-ai':
        // Vercel AI provider expects model objects from the SDK
        if (modelName.startsWith('gpt-')) {
          return openai(modelName);
        } else if (modelName.startsWith('claude-')) {
          return anthropic(modelName);
        } else if (modelName.startsWith('gemini-')) {
          return google(modelName);
        } else if (modelName.includes('groq') || modelName.includes('llama') || modelName.includes('mixtral')) {
          return groq(modelName);
        }
        return google('gemini-2.5-pro-preview-06-05'); // Default to Gemini 2.5 Pro
        
      case 'google-ai':
      case 'groq-ai':
      case 'anthropic-ai':
      case 'xsai':
        // These providers expect string model names
        return modelName;
        
      default:
        return modelName;
    }
  }

  private createMemoryProvider(brandId?: string): SupabaseMemory | undefined {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found, memory will be disabled');
      return undefined;
    }

    return new SupabaseMemory({
      supabaseUrl,
      supabaseKey,
      tableName: 'poweragent_memory',
      // Additional configuration for brand segregation
      metadata: {
        brandId: brandId
      }
    });
  }

  private async createVoiceProvider(voiceConfig: Record<string, unknown>, brandId?: string): Promise<OpenAIVoiceProvider | ElevenLabsVoiceProvider | undefined> {
    const provider = voiceConfig.provider as string;
    
    // TODO: Fetch brand-specific API keys from database using brandId
    // For now, use environment variables
    void brandId; // Suppress unused parameter warning
    
    switch (provider) {
      case 'openai':
        return new OpenAIVoiceProvider({
          apiKey: process.env.OPENAI_API_KEY || '',
          ttsModel: (voiceConfig.ttsModel as string) || 'tts-1',
          voice: (voiceConfig.voice as string) || 'alloy'
        });
        
      case 'elevenlabs':
        // According to memory, use brand's elevenlabs_api_key
        return new ElevenLabsVoiceProvider({
          apiKey: process.env.ELEVENLABS_API_KEY || '',
          voice: voiceConfig.voice as string || 'Rachel',
          ttsModel: voiceConfig.ttsModel as string
        });
        
      default:
        return undefined;
    }
  }

  private async createTools(selectedTools: string[], customTools: PowerAgentConfig['customTools'], provider: string): Promise<(Tool | Toolkit)[]> {
    const tools: (Tool | Toolkit)[] = [];

    // Add built-in tools
    for (const toolId of selectedTools) {
      try {
        if (toolId === 'reasoning') {
          // Use official VoltAgent reasoning tools as a toolkit
          const reasoningToolkit = createReasoningTools();
          tools.push(reasoningToolkit);
          console.log(`[PowerAgentService] Added reasoning toolkit`);
        } else {
          const tool = await this.createBuiltInTool(toolId);
          if (tool) {
            tools.push(tool);
            console.log(`[PowerAgentService] Added built-in tool: ${toolId}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to create built-in tool ${toolId}:`, error);
      }
    }

    // Add custom tools
    for (const customTool of customTools) {
      try {
        const tool = await this.createCustomTool(customTool);
        if (tool) {
          tools.push(tool);
          console.log(`[PowerAgentService] Added custom tool: ${customTool.name}`);
        }
      } catch (error) {
        console.warn(`Failed to create custom tool ${customTool.name}:`, error);
      }
    }

    return tools;
  }

  private async createBuiltInTool(toolId: string): Promise<Tool | null> {
    // Implementation for built-in tools
    switch (toolId) {
      case 'reasoning':
        // This case is now handled in createTools() method using createReasoningTools()
        return null;

      case 'search':
        return createTool({
          name: 'search',
          description: 'Search for information and provide relevant results',
          parameters: z.object({
            query: z.string().describe('The search query'),
            // Remove .default() for Gemini compatibility - handle in execute instead
            type: z.enum(['web', 'academic', 'news', 'general']).optional().describe('Type of search to perform')
          }),
          execute: async ({ query, type }) => {
            const searchType = type || 'general'; // Handle default in execute
            
            // Simulate search results with realistic data
            const searchResults = [
              {
                title: `Understanding ${query}: A Comprehensive Guide`,
                url: `https://example.com/guide-${query.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: `Learn everything about ${query} with this detailed guide covering key concepts, practical applications, and expert insights.`,
                relevance: 0.95
              },
              {
                title: `${query} - Best Practices and Tips`,
                url: `https://example.com/best-practices-${query.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: `Discover proven strategies and best practices for ${query}. Get expert tips and real-world examples.`,
                relevance: 0.88
              },
              {
                title: `Latest News and Updates on ${query}`,
                url: `https://example.com/news-${query.toLowerCase().replace(/\s+/g, '-')}`,
                snippet: `Stay up-to-date with the latest developments and news related to ${query}.`,
                relevance: 0.82
              }
            ];

            return {
              query,
              search_type: searchType,
              results: searchResults,
              total_results: searchResults.length,
              search_time: `${Math.random() * 0.5 + 0.1}s`,
              timestamp: new Date().toISOString()
            };
          }
        });

      case 'calculator':
        return createTool({
          name: 'calculator',
          description: 'Perform mathematical calculations and operations',
          parameters: z.object({
            expression: z.string().describe('Mathematical expression to evaluate (e.g., "2 + 3 * 4")'),
            // Remove .default() for Gemini compatibility
            precision: z.number().optional().describe('Number of decimal places for result')
          }),
          execute: async ({ expression, precision }) => {
            const precisionValue = precision || 2; // Handle default in execute
            
            try {
              // Basic calculator functionality - in production, use a proper math parser
              const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
              
              if (!sanitizedExpression || sanitizedExpression.length === 0) {
                throw new Error('Invalid mathematical expression');
              }

              // Handle simple operations
              let result: number;
              
              if (sanitizedExpression.includes('+')) {
                const parts = sanitizedExpression.split('+').map(p => parseFloat(p.trim()));
                result = parts.reduce((a, b) => a + b, 0);
              } else if (sanitizedExpression.includes('-') && !sanitizedExpression.startsWith('-')) {
                const parts = sanitizedExpression.split('-').map(p => parseFloat(p.trim()));
                result = parts[0] - parts.slice(1).reduce((a, b) => a + b, 0);
              } else if (sanitizedExpression.includes('*')) {
                const parts = sanitizedExpression.split('*').map(p => parseFloat(p.trim()));
                result = parts.reduce((a, b) => a * b, 1);
              } else if (sanitizedExpression.includes('/')) {
                const parts = sanitizedExpression.split('/').map(p => parseFloat(p.trim()));
                result = parts[0] / parts[1];
              } else {
                result = parseFloat(sanitizedExpression);
              }

              if (isNaN(result)) {
                throw new Error('Calculation resulted in NaN');
              }

              return {
                expression,
                result: parseFloat(result.toFixed(precisionValue)),
                formatted_result: result.toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: precisionValue 
                }),
                precision: precisionValue,
                calculation_time: `${Math.random() * 10 + 1}ms`
              };
            } catch (error) {
              return {
                expression,
                error: error instanceof Error ? error.message : 'Calculation failed',
                suggestion: 'Please check your mathematical expression and try again'
              };
            }
          }
        });

      default:
        return null;
    }
  }

  private async createCustomTool(toolConfig: PowerAgentConfig['customTools'][0]): Promise<Tool | null> {
    try {
      // Create parameters schema with proper handling of additionalProperties
      const parameterEntries = Object.entries(toolConfig.parameters || {}).map(([key, value]) => {
        // Check if the parameter is an object with properties
        const paramValue = value as Record<string, unknown>;
        
        // For Gemini compatibility, avoid .default() in schema and handle additionalProperties
        let zodType: z.ZodTypeAny = z.string();
        
        if (typeof paramValue === 'object' && paramValue !== null) {
          // Handle different parameter types
          if (paramValue.type === 'string') {
            zodType = z.string();
          } else if (paramValue.type === 'number') {
            zodType = z.number();
          } else if (paramValue.type === 'boolean') {
            zodType = z.boolean();
          } else if (paramValue.type === 'array') {
            zodType = z.array(z.string());
          } else if (paramValue.type === 'object') {
            // For object types, handle nested properties and additionalProperties
            const nestedEntries: Record<string, z.ZodTypeAny> = {};
            
            if (paramValue.properties && typeof paramValue.properties === 'object') {
              Object.entries(paramValue.properties as Record<string, Record<string, unknown>>).forEach(([nestedKey, nestedValue]) => {
                if (nestedValue.type === 'string') {
                  nestedEntries[nestedKey] = z.string();
                } else if (nestedValue.type === 'number') {
                  nestedEntries[nestedKey] = z.number();
                } else if (nestedValue.type === 'boolean') {
                  nestedEntries[nestedKey] = z.boolean();
                } else {
                  nestedEntries[nestedKey] = z.string();
                }
              });
            }
            
            zodType = z.object(nestedEntries);
            
            // Handle additionalProperties for objects
            if (paramValue.additionalProperties === true) {
              zodType = (zodType as z.ZodObject<any>).passthrough();
            }
          }
          
          // Add description if available
          if (paramValue.description && typeof paramValue.description === 'string') {
            zodType = zodType.describe(paramValue.description);
          }
        } else {
          // If it's just a simple value, use it as description
          zodType = z.string().describe(String(value));
        }
        
        return [key, zodType];
      });

      const parameters = z.object(Object.fromEntries(parameterEntries));

      // Create execute function from code with error handling
      let executeFunction: (params: Record<string, unknown>, options?: Record<string, unknown>) => unknown;
      try {
        executeFunction = new Function('params', 'options', `
          try {
            ${toolConfig.execute_code}
          } catch (error) {
            return { error: error.message || 'Tool execution failed' };
          }
        `) as (params: Record<string, unknown>, options?: Record<string, unknown>) => unknown;
      } catch (error) {
        console.error(`Error compiling custom tool ${toolConfig.name}:`, error);
        return null;
      }

      return createTool({
        name: toolConfig.name,
        description: toolConfig.description,
        parameters,
        execute: async (params, options) => {
          try {
            return await executeFunction(params, options);
          } catch (error) {
            console.error(`Error executing tool ${toolConfig.name}:`, error);
            return { error: error instanceof Error ? error.message : 'Tool execution failed' };
          }
        }
      });
    } catch (error) {
      console.error(`Error creating custom tool ${toolConfig.name}:`, error);
      return null;
    }
  }

  private createHooks(hookConfigs: Record<string, unknown>): Record<string, (...args: any[]) => any> | undefined {
    if (!hookConfigs || Object.keys(hookConfigs).length === 0) {
      return undefined;
    }

    try {
      const executableHooks: Record<string, (...args: any[]) => any> = {};
      
      for (const [hookName, hookCode] of Object.entries(hookConfigs)) {
        if (typeof hookCode === 'string' && hookCode.trim().length > 0) {
          try {
            // Create async hook function with proper error handling
            executableHooks[hookName] = new Function('args', `
              return (async () => {
                try {
                  ${hookCode}
                } catch (error) {
                  console.error('Hook ${hookName} error:', error);
                }
              })();
            `) as (...args: any[]) => any;
          } catch (error) {
            console.warn(`Failed to compile hook ${hookName}:`, error);
          }
        }
      }

      if (Object.keys(executableHooks).length === 0) {
        return undefined;
      }

      return createHooks(executableHooks);
    } catch (error) {
      console.error('Error creating hooks:', error);
      return undefined;
    }
  }
} 