import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';
import { PowerAgentService } from '@/voltagent/agent-service';

const agentService = new PowerAgentService();

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config, input, sessionId, mode } = body;

    if (!config || !input) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a test agent instance (not saved to database)
    const testAgent = await agentService.createAgent({
      ...config,
      id: `test_${Date.now()}`, // Temporary ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Execute the test
    const startTime = Date.now();
    let toolCalls: Array<{ name: string; result: unknown }> = [];
    let subAgentCalls = 0;

    // Track tool calls
    const originalExecute = testAgent.execute.bind(testAgent);
    testAgent.execute = async function(...args: Parameters<typeof originalExecute>) {
      const result = await originalExecute(...args);
      
      // Extract tool calls from the result if available
      if (result && typeof result === 'object' && 'toolCalls' in result) {
        toolCalls = (result as { toolCalls?: Array<{ name: string; result: unknown }> }).toolCalls || [];
      }
      
      // Count sub-agent delegations
      if (result && typeof result === 'object' && 'delegations' in result) {
        subAgentCalls = (result as { delegations?: unknown[] }).delegations?.length || 0;
      }
      
      return result;
    };

    // Execute based on mode
    let response: string;
    let tokensUsed = 0;

    if (mode === 'chat') {
      // Use conversation mode with session
      const result = await testAgent.execute({
        prompt: input,
        conversationId: sessionId
      });
      
      response = typeof result === 'string' ? result : result.text || JSON.stringify(result);
      tokensUsed = result.usage?.totalTokens || 0;
    } else {
      // Single query mode without conversation history
      const result = await testAgent.execute({
        prompt: input
      });
      
      response = typeof result === 'string' ? result : result.text || JSON.stringify(result);
      tokensUsed = result.usage?.totalTokens || 0;
    }

    const executionTime = Date.now() - startTime;

    // Return test results
    return NextResponse.json({
      response,
      tokensUsed,
      executionTime,
      toolCalls,
      subAgentCalls,
      sessionId,
      mode
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