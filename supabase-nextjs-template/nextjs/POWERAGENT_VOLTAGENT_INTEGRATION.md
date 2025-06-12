# PowerAgent VoltAgent Integration Guide

## Overview

This guide documents the complete integration of VoltAgent with the PowerAgent builder system. The integration enables PowerAgent to leverage VoltAgent's full capabilities including multiple LLM providers, tools, memory, voice, hooks, and sub-agents.

## Key Changes and Fixes

### 1. **Correct VoltAgent API Usage**

The integration has been updated to use the correct VoltAgent methods:

- ❌ `agent.execute()` - This method doesn't exist in VoltAgent
- ✅ `agent.generateText()` - For text generation
- ✅ `agent.streamText()` - For streaming text responses
- ✅ `agent.generateObject()` - For structured data generation
- ✅ `agent.streamObject()` - For streaming structured data

### 2. **Provider and Model Configuration**

Different providers expect different model formats:

```typescript
// Vercel AI Provider - expects model objects
model: openai("gpt-4o")
model: anthropic("claude-3-5-sonnet")
model: google("gemini-1.5-pro")

// Other providers - expect string model names
model: "gpt-4o" // for xsAI, Google AI, Groq AI, Anthropic AI
```

### 3. **Memory Configuration**

Fixed SupabaseMemory configuration with correct parameters:

```typescript
memory = new SupabaseMemory({
  supabaseUrl,      // was: url
  supabaseKey,      // was: key
  tableName: 'poweragent_memory',  // was: table
  metadata: {
    brandId: config.brand_id
  }
});
```

### 4. **Voice Provider Integration**

Voice providers are properly configured with brand-specific settings:

```typescript
// OpenAI Voice
new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: 'tts-1',
  voice: 'alloy'
});

// ElevenLabs Voice
new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voice: 'Rachel',
  ttsModel: 'eleven_multilingual_v2'
});

// xsAI Voice
new XsAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: 'tts-1',
  voice: 'alloy',
  baseURL: process.env.XSAI_BASE_URL
});
```

### 5. **Tools and Toolkits**

Tools and toolkits are properly combined in the agent configuration:

```typescript
// Combine individual tools and toolkits
const allTools = [...tools];
toolkits.forEach(toolkit => {
  allTools.push(toolkit);
});

if (allTools.length > 0) {
  agentConfig.tools = allTools;
}
```

## API Endpoints

### 1. **Execute Agent** - `/api/poweragent/agents/[id]/execute`

```typescript
POST /api/poweragent/agents/[id]/execute
{
  "input": "Your prompt here",
  "options": {
    "userId": "user-123",
    "conversationId": "conv-456",
    "temperature": 0.7,
    "maxTokens": 1000
  }
}

Response:
{
  "response": "Agent's text response",
  "tokensUsed": 150,
  "executionTime": 1234,
  "usage": { /* token usage details */ },
  "toolCalls": [],
  "warnings": []
}
```

### 2. **Stream Agent** - `/api/poweragent/agents/[id]/stream`

```typescript
POST /api/poweragent/agents/[id]/stream
{
  "input": "Your prompt here",
  "options": { /* same as execute */ }
}

Response: Server-Sent Events stream
data: {"type":"text","text":"chunk of text"}
data: {"type":"completion","usage":{...},"executionTime":1234}
```

### 3. **Test Agent** - `/api/poweragent/test`

```typescript
POST /api/poweragent/test
{
  "config": { /* agent configuration */ },
  "input": "Test prompt",
  "sessionId": "test_123"
}
```

## Environment Variables

Required environment variables for full functionality:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
GROQ_API_KEY=your_groq_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional
XSAI_BASE_URL=https://api.openai.com/v1
VOLTAGENT_PORT=3141
```

## VoltAgent Initialization

The VoltAgent instance is initialized in `/src/voltagent/index.ts`:

```typescript
const voltAgent = new VoltAgent({
  agents: {}, // Dynamically registered via PowerAgentService
  config: {
    enableObservability: true,
    apiPath: "/api/poweragent",
    enableAPI: true,
    port: process.env.VOLTAGENT_PORT ? parseInt(process.env.VOLTAGENT_PORT) : undefined,
    enableConsole: true
  },
});
```

## Agent Registry

The `AgentRegistry` singleton manages all created agents:

```typescript
// Register an agent
registry.registerAgent(agentId, agentInstance);

// Get an agent
const agent = registry.getAgent(agentId);

// Get all agents
const allAgents = registry.getAllAgents();

// Manage sub-agent relationships
registry.registerRelationship(supervisorId, subAgentId);
const subAgents = registry.getSubAgents(supervisorId);
```

## Common Issues and Solutions

### 1. **"Cannot read properties of null" Error**

This occurs when trying to use methods that don't exist on the Agent class. Ensure you're using:
- `generateText()` instead of `execute()`
- `streamText()` for streaming responses

### 2. **Provider API Key Errors**

Ensure all required API keys are set in your environment variables. The system will warn if credentials are missing but won't fail completely.

### 3. **Memory Not Working**

Check that:
- Supabase credentials are properly set
- The `poweragent_memory` table exists in your database
- The table has proper RLS policies for brand segregation

### 4. **Streaming Not Working**

Ensure your client properly handles Server-Sent Events:
```javascript
const response = await fetch('/api/poweragent/agents/123/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: 'Hello' })
});

const reader = response.body.getReader();
// Process the stream...
```

## Testing the Integration

1. **Create an Agent**: Use the PowerAgent builder UI to create a new agent
2. **Test Execution**: Use the AgentTester component or call the API directly
3. **Check Metrics**: Verify metrics are being tracked in the `poweragent_metrics` table
4. **Test Streaming**: Use the stream endpoint to verify real-time responses

## Future Enhancements

1. **Brand-Specific API Keys**: Fetch API keys from brand configuration instead of environment variables
2. **Advanced Memory**: Implement vector search and semantic retrieval
3. **Custom Tools API**: Allow users to create and manage custom tools via API
4. **Webhook Integration**: Add webhook support for agent events
5. **Performance Optimization**: Implement agent caching and lazy loading 