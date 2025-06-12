import { NextResponse } from 'next/server';
import { PowerAgentService } from '@/voltagent/agent-service';

const agentService = new PowerAgentService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, input, sessionId } = body;

    if (!input || !config) {
      return NextResponse.json(
        { error: 'Input and config are required' },
        { status: 400 }
      );
    }

    // Create a temporary agent instance for testing
    const agentInstance = await agentService.createAgent({
      ...config,
      id: `test_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const startTime = Date.now();

    // Execute the agent based on mode
    const result = await agentInstance.generateText(input, {
      conversationId: sessionId,
      // Add test-specific options
      provider: {
        temperature: 0.7,
        maxTokens: 1000
      }
    });

    const executionTime = Date.now() - startTime;

    // Extract tool calls information
    const toolCalls = [];
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        toolCalls.push({
          name: toolCall.toolName,
          result: toolCall.result
        });
      }
    }

    return NextResponse.json({
      response: result.text,
      tokensUsed: result.usage?.totalTokens || 0,
      executionTime,
      toolCalls,
      subAgentCalls: 0, // TODO: Track sub-agent calls
      usage: result.usage
    });

  } catch (error) {
    console.error('Test execution error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test execution failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 