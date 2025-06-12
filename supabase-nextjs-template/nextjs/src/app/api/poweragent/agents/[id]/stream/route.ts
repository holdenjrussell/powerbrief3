import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';
import { PowerAgentService } from '@/voltagent/agent-service';

const agentService = new PowerAgentService();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { input, options } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Get agent from database
    const { data: agent, error: agentError } = await supabase
      .from('poweragent_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check brand access
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', agent.brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create agent instance
    const agentInstance = await agentService.createAgent({
      ...agent.config,
      id: agent.id,
      brand_id: agent.brand_id,
      created_at: agent.created_at,
      updated_at: agent.updated_at
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const startTime = Date.now();
          
          // Use streamText for streaming generation
          const result = await agentInstance.streamText(input, {
            userId: options?.userId || user.id,
            conversationId: options?.conversationId,
            // Add provider options if provided
            provider: options?.provider || {
              temperature: options?.temperature,
              maxTokens: options?.maxTokens,
              topP: options?.topP,
              frequencyPenalty: options?.frequencyPenalty,
              presencePenalty: options?.presencePenalty,
              seed: options?.seed,
              stopSequences: options?.stopSequences
            }
          });

          // Stream the text chunks
          for await (const chunk of result.textStream) {
            const data = JSON.stringify({
              type: 'text',
              text: chunk
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Get final usage data
          const usage = await result.usage;
          const executionTime = Date.now() - startTime;

          // Send completion event with metadata
          const completionData = JSON.stringify({
            type: 'completion',
            usage,
            executionTime,
            tokensUsed: usage?.totalTokens || 0
          });
          controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));

          // Track metrics
          await supabase
            .from('poweragent_metrics')
            .insert({
              agent_id: params.id,
              user_id: user.id,
              conversation_id: options?.conversationId,
              tokens_used: usage?.totalTokens || null,
              execution_time_ms: executionTime,
              success: true,
            });

          controller.close();
        } catch (error) {
          // Send error event
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream generation failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();

          // Track error metrics
          await supabase
            .from('poweragent_metrics')
            .insert({
              agent_id: params.id,
              user_id: user.id,
              tokens_used: null,
              execution_time_ms: 0,
              success: false,
            });
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Agent streaming error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Agent streaming failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 