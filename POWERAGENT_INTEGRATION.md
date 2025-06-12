# PowerAgent Integration with VoltAgent

## Overview

PowerAgent is a new AI-powered feature integrated into PowerBrief that leverages the VoltAgent framework to provide intelligent automation and assistance across all PowerBrief modules. This integration brings advanced AI capabilities to enhance marketing workflows, content creation, and campaign management.

## Architecture

### VoltAgent Framework
- **Core**: VoltAgent is an open-source TypeScript AI agent framework
- **Provider**: Using Vercel AI SDK for LLM integrations
- **Models**: Supports OpenAI (GPT-4), Anthropic (Claude 3.5), and Google (Gemini 2.0)
- **Observability**: Integrated with VoltOps platform for real-time monitoring

### PowerBrief Integration Points
1. **PowerBrief**: Brief generation and content strategy
2. **PowerFrame**: Visual content analysis and recommendations
3. **UGC Pipeline**: Creator management and communication automation
4. **Asset Reviews**: Automated review processes
5. **Ad Upload Tool**: Copy generation and optimization
6. **Team Sync**: Performance analytics and reporting

## Available Agents

PowerAgent is ready for you to create custom AI agents tailored to your specific needs. The framework is set up and waiting for your agent configurations.

### Creating Your First Agent

Here's a simple example to get started:

```typescript
// In src/voltagent/index.ts
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const myAgent = new Agent({
  name: "My Assistant",
  instructions: "A helpful assistant for PowerBrief tasks",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: {
    myAgent,
  },
  config: {
    enableObservability: true,
    apiPath: "/api/poweragent",
  },
});
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd supabase-nextjs-template/nextjs
npm install @voltagent/core @voltagent/vercel-ai @voltagent/cli @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google zod
```

### 2. Configure Environment Variables
Add the following to your `.env.local` file:
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

### 3. Start VoltAgent Server
```bash
npm run volt
```

This will start the VoltAgent server on port 3141.

### 4. Access VoltOps Console
Visit https://console.voltagent.dev to monitor your agents in real-time.

## Usage

### Accessing PowerAgent
1. Navigate to PowerAgent from the main sidebar
2. View the overview dashboard for agent statistics
3. Manage individual agents from the AI Agents tab
4. Configure workflows in the Workflows tab
5. Monitor performance in the Analytics tab

### Using Agent Chat
The AgentChat component can be embedded anywhere in PowerBrief:

```tsx
import { FloatingAgentChat } from '@/components/poweragent/AgentChat';

// Add to any page
<FloatingAgentChat
  agentId="briefGenerator"
  agentName="Brief Generator"
  agentDescription="AI assistant for creating marketing briefs"
  brandId={selectedBrand?.id}
  context={{ page: 'powerbrief' }}
/>
```

### API Endpoints

#### Chat Endpoint
```
POST /api/poweragent/chat
{
  "agentId": "briefGenerator",
  "message": "Create a brief for summer campaign",
  "brandId": "brand_123",
  "context": {},
  "conversationHistory": []
}
```

#### Health Check
```
GET /api/poweragent/health
```

## Development

### Adding New Agents
1. Define the agent in `/src/voltagent/index.ts`
2. Create tools using `createTool` from VoltAgent
3. Configure the agent with appropriate model and instructions
4. Add the agent to the VoltAgent initialization

### Creating Custom Tools
```typescript
const customTool = createTool({
  name: "tool_name",
  description: "Tool description",
  parameters: z.object({
    // Define parameters using Zod schema
  }),
  execute: async (args) => {
    // Tool implementation
    return { result: "success" };
  }
});
```

### Workflow Automation
Workflows can be created to chain multiple agent actions:
1. Define trigger conditions
2. Configure agent sequence
3. Set up conditional logic
4. Monitor execution in VoltOps

## Best Practices

1. **Context Management**: Always provide relevant context to agents
2. **Error Handling**: Implement proper error handling in tool executions
3. **Rate Limiting**: Be mindful of API rate limits for different providers
4. **Security**: Never expose API keys in client-side code
5. **Monitoring**: Use VoltOps console for debugging and optimization

## Troubleshooting

### Common Issues

1. **Agent Not Responding**
   - Check VoltAgent server is running (`npm run volt`)
   - Verify API keys are configured
   - Check network connectivity

2. **Performance Issues**
   - Monitor token usage in VoltOps
   - Optimize context size
   - Consider using smaller models for simple tasks

3. **Integration Errors**
   - Ensure all dependencies are installed
   - Check for TypeScript errors
   - Verify API route configuration

## Future Enhancements

1. **Voice Integration**: Add voice interaction capabilities
2. **Multi-Agent Workflows**: Complex workflows with multiple agents
3. **Custom Model Training**: Fine-tuned models for specific tasks
4. **Advanced Analytics**: Deeper insights into agent performance
5. **Plugin System**: Extensible architecture for custom integrations

## Support

For issues or questions:
1. Check VoltAgent documentation: https://voltagent.dev
2. Monitor agents in VoltOps: https://console.voltagent.dev
3. Review PowerBrief logs for integration errors 