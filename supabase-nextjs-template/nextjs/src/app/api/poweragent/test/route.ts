import { NextResponse } from 'next/server';
import { PowerAgentService } from '@/voltagent/agent-service';
import { sanitizeToolParameters } from '@/lib/utils/sanitize';

// Initialize the PowerAgentService
const powerAgentService = new PowerAgentService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, input, sessionId } = body;

    if (!config) {
      return NextResponse.json({ error: 'Agent configuration is required' }, { status: 400 });
    }

    if (!input) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Sanitize tool parameters to ensure they are valid Zod schemas
    if (config.customTools && Array.isArray(config.customTools)) {
      config.customTools = config.customTools.map(tool => ({
        ...tool,
        parameters: sanitizeToolParameters(tool.parameters)
      }));
    }

    // Create a temporary agent for testing
    const agent = await powerAgentService.createAgent({
      ...config,
      id: `test_${Date.now()}`,
      brand_id: config.brand_id || 'test_brand'
    });

    // Execute the agent with the provided input
    const result = await agent.generateText(input, {
      userId: sessionId || 'test_user',
      conversationId: sessionId || `test_${Date.now()}`
    });

    return NextResponse.json({
      response: result.text,
      tokensUsed: result.usage?.totalTokens || 0,
      executionTime: result.executionTime || 0,
      toolCalls: result.toolCalls || [],
      subAgentCalls: result.subAgentCalls || 0,
      usage: result.usage
    });
  } catch (error: any) {
    console.error('Test agent error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Test agent failed',
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 