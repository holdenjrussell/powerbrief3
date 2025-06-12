import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// This script creates a comprehensive test agent with all features enabled
// Run with: npx tsx src/scripts/create-test-agent.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function createTestAgent() {
  console.log('🚀 Creating comprehensive test agent...\n');

  // First, get the user and brand
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('❌ Error: You must be logged in to create an agent');
    console.log('Please log in to the application first and ensure your session is active');
    return;
  }

  console.log(`✅ Authenticated as: ${user.email}\n`);

  // Get the user's first brand
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  if (brandsError || !brands || brands.length === 0) {
    console.error('❌ Error: No brands found for user');
    console.log('Please create a brand first in the application');
    return;
  }

  const brand = brands[0];
  console.log(`✅ Using brand: ${brand.name} (${brand.id})\n`);

  // Create comprehensive agent configuration
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
        type: 'custom' as const,
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
    subAgents: [], // Will be populated if we create sub-agents
    delegationRules: {},
    isSupervisor: false
  };

  // Create the agent
  console.log('📝 Creating agent in database...\n');
  
  const { data: agent, error: agentError } = await supabase
    .from('poweragent_agents')
    .insert({
      brand_id: brand.id,
      name: testAgentConfig.name,
      purpose: testAgentConfig.purpose,
      instructions: testAgentConfig.instructions,
      provider: testAgentConfig.provider,
      model: testAgentConfig.model,
      config: testAgentConfig
    })
    .select()
    .single();

  if (agentError || !agent) {
    console.error('❌ Error creating agent:', agentError);
    return;
  }

  console.log('✅ Agent created successfully!\n');
  console.log('📋 Agent Details:');
  console.log(`   ID: ${agent.id}`);
  console.log(`   Name: ${agent.name}`);
  console.log(`   Brand: ${brand.name}`);
  console.log('\n🔧 Features Enabled:');
  console.log(`   ✓ Provider: ${testAgentConfig.provider} (${testAgentConfig.model})`);
  console.log(`   ✓ Tools: ${testAgentConfig.selectedTools.length} built-in + ${testAgentConfig.customTools.length} custom`);
  console.log(`   ✓ Memory: ${testAgentConfig.memory.enabled ? 'Enabled (Supabase)' : 'Disabled'}`);
  console.log(`   ✓ Voice: ${testAgentConfig.voice.enabled ? `Enabled (${testAgentConfig.voice.provider})` : 'Disabled'}`);
  console.log(`   ✓ Hooks: ${Object.keys(testAgentConfig.hooks).length} configured`);
  console.log(`   ✓ Retrievers: ${testAgentConfig.retrievers.length} configured`);
  
  console.log('\n🧪 Testing Instructions:');
  console.log('1. Go to the PowerAgent dashboard: /app/poweragent/agents');
  console.log('2. Find "VoltAgent Test Assistant" in the list');
  console.log('3. Click on it to view details or use the Test button');
  console.log('4. Try these test prompts:');
  console.log('   - "What features do you have?"');
  console.log('   - "Calculate 25 * 4 + 10"');
  console.log('   - "Search for information about TypeScript"');
  console.log('   - "What\'s the weather in New York?"');
  console.log('   - "Analyze this text: VoltAgent is amazing!"');
  console.log('   - "Format this as JSON: name=John, age=30, city=NYC"');
  
  console.log('\n📊 API Testing:');
  console.log(`   POST /api/poweragent/agents/${agent.id}/execute`);
  console.log('   Body: { "input": "Hello, what can you do?" }');
  
  console.log('\n🎉 Test agent created successfully!');
}

// Run the script
createTestAgent().catch(console.error); 