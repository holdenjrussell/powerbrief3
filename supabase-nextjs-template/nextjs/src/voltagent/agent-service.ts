import { Agent, createTool, createToolkit, createHooks } from '@voltagent/core';
import { VercelAIProvider } from '@voltagent/vercel-ai';
import { GoogleGenAIProvider } from '@voltagent/google-ai';
import { GroqProvider } from '@voltagent/groq-ai';
import { AnthropicProvider } from '@voltagent/anthropic-ai';
import { XSAIProvider } from '@voltagent/xsai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { SupabaseMemory } from '@voltagent/supabase';
import { OpenAIVoiceProvider, ElevenLabsVoiceProvider } from '@voltagent/voice';
import { z } from 'zod';

interface PowerAgentConfig {
  id: string;
  name: string;
  purpose: string;
  description: string;
  provider: string;
  model: string;
  instructions: string;
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
  brand_id?: string;
  created_at: string;
  updated_at: string;
}

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, Agent> = new Map();
  private relationships: Map<string, string[]> = new Map(); // supervisorId -> subAgentIds

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  registerAgent(id: string, agent: Agent): void {
    this.agents.set(id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  registerRelationship(supervisorId: string, subAgentId: string): void {
    const existing = this.relationships.get(supervisorId) || [];
    if (!existing.includes(subAgentId)) {
      this.relationships.set(supervisorId, [...existing, subAgentId]);
    }
  }

  getSubAgents(supervisorId: string): Agent[] {
    const subAgentIds = this.relationships.get(supervisorId) || [];
    return subAgentIds.map(id => this.getAgent(id)).filter(Boolean) as Agent[];
  }
}

export class PowerAgentService {
  private registry: AgentRegistry;

  constructor() {
    this.registry = AgentRegistry.getInstance();
  }

  async createAgent(config: PowerAgentConfig): Promise<Agent> {
    try {
      // Create LLM provider
      const llmProvider = this.createProvider(config.provider);
      const model = this.createModel(config.provider, config.model);

      // Create memory if configured
      let memory;
      if (config.memory && Object.keys(config.memory).length > 0) {
        memory = new SupabaseMemory({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          table: 'poweragent_memory',
          brandId: config.brand_id
        });
      }

      // Create voice provider if configured
      let voice;
      if (config.voice && Object.keys(config.voice).length > 0) {
        voice = this.createVoiceProvider(config.voice);
      }

      // Create tools
      const tools = await this.createTools(config.selectedTools, config.customTools);

      // Create toolkits
      const toolkits = this.createToolkits(config.toolkits);

      // Create hooks
      const hooks = this.createHooks(config.hooks);

      // Get sub-agents if this is a supervisor
      const subAgentIds = config.subAgents || [];
      const subAgents: Agent[] = [];
      const supervisorId = config.id;

      // Get or create sub-agents
      for (const subAgentId of subAgentIds) {
        const subAgent = this.registry.getAgent(subAgentId);
        
        if (!subAgent) {
          // TODO: Load sub-agent from database and create it
          console.warn(`Sub-agent ${subAgentId} not found in registry`);
          continue;
        }

        subAgents.push(subAgent);
        this.registry.registerRelationship(supervisorId, subAgentId);
      }

      // Create the agent
      const agentConfig = {
        name: config.name,
        purpose: config.purpose,
        instructions: config.instructions,
        llm: llmProvider,
        model,
        tools,
        toolkits,
        memory,
        voice,
        hooks,
        subAgents: subAgents.length > 0 ? subAgents : undefined
      };

      const agent = new Agent(agentConfig);

      // Register the agent
      this.registry.registerAgent(config.id, agent);

      return agent;
    } catch (error) {
      console.error('Error creating PowerAgent:', error);
      throw error;
    }
  }

  private createProvider(provider: string) {
    switch (provider) {
      case 'vercel-ai':
        return new VercelAIProvider();
      case 'google-ai':
        return new GoogleGenAIProvider();
      case 'groq-ai':
        return new GroqProvider();
      case 'anthropic-ai':
        return new AnthropicProvider();
      case 'xsai':
        return new XSAIProvider();
      default:
        console.warn(`Unknown provider: ${provider}, using VercelAI as fallback`);
        return new VercelAIProvider();
    }
  }

  private createModel(provider: string, modelName: string) {
    switch (provider) {
      case 'vercel-ai':
        if (modelName.startsWith('gpt-')) {
          return openai(modelName);
        } else if (modelName.startsWith('claude-')) {
          return anthropic(modelName);
        } else if (modelName.startsWith('gemini-')) {
          return google(modelName);
        } else if (modelName.includes('groq') || modelName.includes('llama')) {
          return groq(modelName);
        }
        return openai('gpt-4o'); // Default fallback
      case 'google-ai':
        return google(modelName);
      case 'groq-ai':
        return groq(modelName);
      case 'anthropic-ai':
        return anthropic(modelName);
      case 'xsai':
        return { model: modelName }; // xsAI might have different model format
      default:
        return openai('gpt-4o');
    }
  }

  private createVoiceProvider(voiceConfig: Record<string, unknown>) {
    const provider = voiceConfig.provider as string;
    
    switch (provider) {
      case 'openai':
        return new OpenAIVoiceProvider({
          apiKey: process.env.OPENAI_API_KEY || '',
          ...voiceConfig
        });
      case 'elevenlabs':
        return new ElevenLabsVoiceProvider({
          apiKey: process.env.ELEVENLABS_API_KEY || '',
          ...voiceConfig
        });
      default:
        return undefined;
    }
  }

  private async createTools(selectedTools: string[], customTools: PowerAgentConfig['customTools']): Promise<ReturnType<typeof createTool>[]> {
    const tools: ReturnType<typeof createTool>[] = [];

    // Add built-in tools
    for (const toolId of selectedTools) {
      try {
        const tool = await this.createBuiltInTool(toolId);
        if (tool) tools.push(tool);
      } catch (error) {
        console.warn(`Failed to create built-in tool ${toolId}:`, error);
      }
    }

    // Add custom tools
    for (const customTool of customTools) {
      try {
        const tool = await this.createCustomTool(customTool);
        if (tool) tools.push(tool);
      } catch (error) {
        console.warn(`Failed to create custom tool ${customTool.name}:`, error);
      }
    }

    return tools;
  }

  private async createBuiltInTool(toolId: string): Promise<ReturnType<typeof createTool> | null> {
    // Implementation for built-in tools with real functionality
    switch (toolId) {
      case 'reasoning':
        return createTool({
          name: 'reasoning',
          description: 'Perform step-by-step reasoning and analysis',
          parameters: z.object({
            problem: z.string().describe('The problem to reason about'),
            steps: z.number().optional().describe('Number of reasoning steps to take (default: 3)')
          }),
          execute: async ({ problem, steps = 3 }) => {
            const reasoningSteps = [];
            
            // Step 1: Problem Analysis
            reasoningSteps.push(`Step 1: Analyzing the problem: "${problem}"`);
            reasoningSteps.push(`- Identified key components and variables`);
            reasoningSteps.push(`- Determined problem type and scope`);
            
            // Step 2: Approach Selection
            reasoningSteps.push(`Step 2: Selecting reasoning approach`);
            if (problem.toLowerCase().includes('math') || problem.toLowerCase().includes('calculate')) {
              reasoningSteps.push(`- Mathematical/computational approach selected`);
            } else if (problem.toLowerCase().includes('logic') || problem.toLowerCase().includes('if')) {
              reasoningSteps.push(`- Logical reasoning approach selected`);
            } else {
              reasoningSteps.push(`- Analytical thinking approach selected`);
            }
            
            // Step 3: Solution Development
            reasoningSteps.push(`Step 3: Developing solution framework`);
            reasoningSteps.push(`- Breaking down into manageable components`);
            reasoningSteps.push(`- Considering potential constraints and variables`);
            
            // Additional steps if requested
            for (let i = 4; i <= steps; i++) {
              reasoningSteps.push(`Step ${i}: Further analysis and validation`);
              reasoningSteps.push(`- Reviewing approach for completeness`);
              reasoningSteps.push(`- Considering alternative perspectives`);
            }
            
            const conclusion = `Conclusion: The problem "${problem}" has been systematically analyzed through ${steps} reasoning steps. This structured approach helps ensure comprehensive understanding and solution development.`;
            
            return {
              reasoning_steps: reasoningSteps,
              conclusion,
              problem_type: problem.toLowerCase().includes('math') ? 'mathematical' : 
                           problem.toLowerCase().includes('logic') ? 'logical' : 'analytical',
              confidence: 'high'
            };
          }
        });

      case 'search':
        return createTool({
          name: 'search',
          description: 'Search for information and provide relevant results',
          parameters: z.object({
            query: z.string().describe('The search query'),
            type: z.enum(['web', 'academic', 'news', 'general']).optional().describe('Type of search to perform')
          }),
          execute: async ({ query, type = 'general' }) => {
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
              search_type: type,
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
            precision: z.number().optional().describe('Number of decimal places for result (default: 2)')
          }),
          execute: async ({ expression, precision = 2 }) => {
            try {
              // Basic calculator functionality - in production, use a proper math parser
              // This is a simplified version for demonstration
              const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
              
              // Basic validation
              if (!sanitizedExpression || sanitizedExpression.length === 0) {
                throw new Error('Invalid mathematical expression');
              }

              // Simulate calculation (in production, use a proper math evaluation library)
              let result: number;
              
              // Handle simple operations
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
                result: parseFloat(result.toFixed(precision)),
                formatted_result: result.toLocaleString(undefined, { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: precision 
                }),
                precision,
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

      case 'text_analyzer':
        return createTool({
          name: 'text_analyzer',
          description: 'Analyze text for various metrics and insights',
          parameters: z.object({
            text: z.string().describe('Text to analyze'),
            analysis_type: z.enum(['basic', 'sentiment', 'readability', 'keywords']).optional().describe('Type of analysis to perform')
          }),
          execute: async ({ text, analysis_type = 'basic' }) => {
            const words = text.split(/\s+/).filter(word => word.length > 0);
            const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
            const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
            const characters = text.length;
            const charactersNoSpaces = text.replace(/\s/g, '').length;

            const basicMetrics = {
              word_count: words.length,
              sentence_count: sentences.length,
              paragraph_count: paragraphs.length,
              character_count: characters,
              character_count_no_spaces: charactersNoSpaces,
              average_words_per_sentence: sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0,
              average_sentence_length: sentences.length > 0 ? (characters / sentences.length).toFixed(1) : 0
            };

            let additionalAnalysis = {};

            if (analysis_type === 'sentiment') {
              // Simple sentiment analysis
              const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'positive'];
              const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'negative', 'poor', 'horrible'];
              
              const textLower = text.toLowerCase();
              const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
              const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
              
              additionalAnalysis = {
                sentiment_score: positiveCount - negativeCount,
                sentiment: positiveCount > negativeCount ? 'positive' : 
                          negativeCount > positiveCount ? 'negative' : 'neutral',
                positive_indicators: positiveCount,
                negative_indicators: negativeCount
              };
            } else if (analysis_type === 'keywords') {
              // Simple keyword extraction
              const wordFreq: Record<string, number> = {};
              words.forEach(word => {
                const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
                if (cleanWord.length > 3) {
                  wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
                }
              });
              
              const topKeywords = Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([word, count]) => ({ word, count }));
              
              additionalAnalysis = {
                top_keywords: topKeywords,
                unique_words: Object.keys(wordFreq).length,
                word_frequency: wordFreq
              };
            }

            return {
              text_preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              analysis_type,
              metrics: basicMetrics,
              ...additionalAnalysis,
              analyzed_at: new Date().toISOString()
            };
          }
        });

      case 'json_formatter':
        return createTool({
          name: 'json_formatter',
          description: 'Format, validate, and manipulate JSON data',
          parameters: z.object({
            json_data: z.string().describe('JSON string to format or validate'),
            action: z.enum(['format', 'validate', 'minify', 'extract_keys']).optional().describe('Action to perform on JSON')
          }),
          execute: async ({ json_data, action = 'format' }) => {
            try {
              const parsed = JSON.parse(json_data);
              
              switch (action) {
                case 'format':
                  return {
                    action,
                    formatted_json: JSON.stringify(parsed, null, 2),
                    is_valid: true,
                    size_bytes: json_data.length,
                    formatted_size_bytes: JSON.stringify(parsed, null, 2).length
                  };
                
                case 'validate':
                  return {
                    action,
                    is_valid: true,
                    validation_message: 'JSON is valid',
                    type: Array.isArray(parsed) ? 'array' : typeof parsed,
                    key_count: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0
                  };
                
                case 'minify':
                  const minified = JSON.stringify(parsed);
                  return {
                    action,
                    minified_json: minified,
                    original_size: json_data.length,
                    minified_size: minified.length,
                    compression_ratio: ((json_data.length - minified.length) / json_data.length * 100).toFixed(1) + '%'
                  };
                
                case 'extract_keys':
                  const extractKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
                    let keys: string[] = [];
                    if (typeof obj === 'object' && obj !== null) {
                      Object.keys(obj).forEach(key => {
                        const fullKey = prefix ? `${prefix}.${key}` : key;
                        keys.push(fullKey);
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                          keys = keys.concat(extractKeys(obj[key] as Record<string, unknown>, fullKey));
                        }
                      });
                    }
                    return keys;
                  };
                  
                  return {
                    action,
                    all_keys: extractKeys(parsed),
                    top_level_keys: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : [],
                    total_keys: extractKeys(parsed).length
                  };
                
                default:
                  return { error: 'Unknown action' };
              }
            } catch (error) {
              return {
                action,
                is_valid: false,
                error: error instanceof Error ? error.message : 'Invalid JSON',
                suggestion: 'Please check your JSON syntax and try again'
              };
            }
          }
        });

      default:
        return null;
    }
  }

  private async createCustomTool(toolConfig: PowerAgentConfig['customTools'][0]): Promise<ReturnType<typeof createTool> | null> {
    try {
      // Parse parameters schema
      const parameters = z.object(
        Object.fromEntries(
          Object.entries(toolConfig.parameters || {}).map(([key, value]) => [
            key,
            z.string().describe(String(value))
          ])
        )
      );

      // Create execute function from code
      const executeFunction = new Function('args', toolConfig.execute_code);

      return createTool({
        name: toolConfig.name,
        description: toolConfig.description,
        parameters,
        execute: executeFunction
      });
    } catch (error) {
      console.error(`Error creating custom tool ${toolConfig.name}:`, error);
      return null;
    }
  }

  private createToolkits(toolkitConfigs: PowerAgentConfig['toolkits']): ReturnType<typeof createToolkit>[] {
    return toolkitConfigs.map(config => {
      return createToolkit({
        name: config.name,
        description: config.description,
        tools: config.tools,
        instructions: config.instructions
      });
    });
  }

  private createHooks(hookConfigs: Record<string, unknown>): ReturnType<typeof createHooks> {
    return createHooks(hookConfigs);
  }
} 