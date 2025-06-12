# PowerAgent VoltAgent Testing Guide

## Quick Start Testing

### 1. Create a Test Agent

The easiest way to test the VoltAgent integration is to use the built-in test agent creator:

1. Navigate to `/app/poweragent/agents`
2. If you have no agents, you'll see a **"Create Test Agent with All Features"** button
3. Click the button to automatically create a comprehensive test agent

The test agent includes:
- ✅ All built-in tools (reasoning, search, calculator, text analyzer, JSON formatter)
- ✅ Custom weather tool
- ✅ Memory (Supabase)
- ✅ Voice capabilities (OpenAI)
- ✅ Hooks for logging
- ✅ Retrievers for knowledge base
- ✅ Conversation management

### 2. Test the Agent

Once created, you can test the agent in multiple ways:

#### A. Using the Agent Tester UI

1. Click on the test agent card in the agents list
2. Go to the "Test" tab
3. Try these prompts:

```
"What features do you have?"
"Calculate 25 * 4 + 10"
"Search for information about TypeScript"
"What's the weather in New York?"
"Analyze this text: VoltAgent is amazing!"
"Format this as JSON: name=John, age=30, city=NYC"
```

#### B. Using the API Directly

```bash
# Get your agent ID from the UI
AGENT_ID="your-agent-id-here"

# Test text generation
curl -X POST http://localhost:3000/api/poweragent/agents/$AGENT_ID/execute \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "input": "Hello! What can you do?",
    "options": {
      "temperature": 0.7,
      "maxTokens": 500
    }
  }'

# Test streaming
curl -N -X POST http://localhost:3000/api/poweragent/agents/$AGENT_ID/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "input": "Tell me a story about AI agents"
  }'
```

## Debugging Common Issues

### 1. Agent Not Responding or Same Response

**Issue**: Agent produces the same response every time or doesn't respond properly.

**Solution**:
- Check environment variables are set:
  ```bash
  OPENAI_API_KEY=your-key
  ANTHROPIC_API_KEY=your-key
  GOOGLE_AI_API_KEY=your-key
  ```
- Verify the agent is using `generateText()` not `execute()`
- Check browser console for errors
- Look at server logs for API key errors

### 2. Tools Not Working

**Issue**: Tools are not being called or producing errors.

**Solution**:
- Ensure tools are properly registered in the agent config
- Check that tool names match exactly
- Verify tool parameters are correctly defined
- Look for tool execution logs in the console

### 3. Memory Not Persisting

**Issue**: Agent doesn't remember previous conversations.

**Solution**:
- Check Supabase credentials are set
- Verify `poweragent_memory` table exists
- Ensure conversation ID is being passed
- Check RLS policies on the memory table

### 4. Voice Not Working

**Issue**: Voice features are not functioning.

**Solution**:
- Verify voice provider API keys (OpenAI or ElevenLabs)
- Check voice configuration in agent settings
- Ensure browser supports audio playback
- Look for voice-related errors in console

## Testing Checklist

### Basic Functionality
- [ ] Agent responds to simple prompts
- [ ] Responses are varied and contextual
- [ ] Agent follows its instructions

### Tools
- [ ] Calculator performs math operations
- [ ] Search tool returns mock results
- [ ] Text analyzer provides analysis
- [ ] JSON formatter creates valid JSON
- [ ] Custom weather tool returns data

### Memory
- [ ] Agent remembers previous messages in chat mode
- [ ] Context is maintained across conversations
- [ ] Memory is cleared between sessions

### Streaming
- [ ] Streaming endpoint returns chunks
- [ ] Text appears progressively
- [ ] Completion event includes usage data

### Error Handling
- [ ] Invalid inputs return appropriate errors
- [ ] Missing API keys show clear warnings
- [ ] Failed tool calls don't crash the agent

## Advanced Testing

### 1. Performance Testing

Monitor these metrics in the AgentTester:
- **Response Time**: Should be < 5 seconds for simple queries
- **Token Usage**: Track tokens per request
- **Tool Call Count**: Verify tools are used efficiently

### 2. Multi-Turn Conversations

Test conversation flow:
```
User: "My name is Alice"
Agent: [Should acknowledge the name]

User: "What's my name?"
Agent: [Should remember "Alice"]

User: "Calculate 10 + 20"
Agent: [Should perform calculation]

User: "What was the result?"
Agent: [Should remember "30"]
```

### 3. Tool Chaining

Test complex queries that require multiple tools:
```
"Search for Python, analyze the results, and format them as JSON"
```

The agent should:
1. Use the search tool
2. Use the text analyzer on results
3. Use the JSON formatter

### 4. Error Recovery

Test error scenarios:
- Invalid tool parameters
- Malformed requests
- Network timeouts
- Rate limiting

## Monitoring and Logs

### Server Logs

Watch the Next.js server console for:
```
[Agent Start] Session: xxx, Time: xxx
[Tool Start] tool_name - {args}
[Tool End] tool_name - Success: true
[Agent End] Session: xxx, Duration: xxxms
[Token Usage] Total: xxx
```

### Browser Console

Check for:
- API request/response details
- Tool execution logs
- Error messages
- Performance warnings

### Database Metrics

Query the metrics table:
```sql
SELECT 
  agent_id,
  COUNT(*) as total_calls,
  AVG(tokens_used) as avg_tokens,
  AVG(execution_time_ms) as avg_time,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM poweragent_metrics
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY agent_id;
```

## Troubleshooting Script

Run this script to verify your setup:

```typescript
// Save as check-setup.ts and run with: npx tsx check-setup.ts

async function checkSetup() {
  console.log('🔍 Checking PowerAgent Setup...\n');

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
  } else {
    console.log('✅ All required environment variables are set');
  }

  // Test Supabase connection
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { error } = await supabase.from('brands').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.error('❌ Supabase setup error:', error);
  }

  // Check VoltAgent packages
  try {
    await import('@voltagent/core');
    console.log('✅ VoltAgent core package installed');
  } catch {
    console.error('❌ VoltAgent core package not found');
  }

  console.log('\n🎉 Setup check complete!');
}

checkSetup();
```

## Next Steps

1. **Create More Agents**: Try creating agents with different configurations
2. **Build Custom Tools**: Add your own tools for specific use cases
3. **Test Sub-Agents**: Create supervisor agents with delegation
4. **Monitor Performance**: Use the metrics dashboard to track usage
5. **Integrate with Your App**: Use the API endpoints in your application

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review server logs for detailed error messages
3. Verify all environment variables are set
4. Ensure database migrations have been run
5. Check the VoltAgent documentation for API details 