import { NextRequest, NextResponse } from 'next/server';
import { getUgcAiCoordinator } from '@/lib/services/ugcAiCoordinator';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set up Server-Sent Events headers
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Function to send SSE event
    const sendEvent = (type: string, data: Record<string, unknown>) => {
      const eventData = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      writer.write(encoder.encode(eventData));
    };

    // Start streaming process in background
    (async () => {
      try {
        sendEvent('started', { message: 'Starting AI coordinator analysis...', timestamp: new Date().toISOString() });

        const ugcAiCoordinator = getUgcAiCoordinator();
        
        // Create streaming version of processPipeline
        const result = await ugcAiCoordinator.processPipelineStream(brandId, sendEvent);

        sendEvent('completed', { 
          message: 'Analysis completed successfully', 
          summary: result.summary,
          timestamp: new Date().toISOString() 
        });

      } catch (error) {
        console.error('Streaming analysis error:', error);
        sendEvent('error', { 
          message: error instanceof Error ? error.message : 'Analysis failed',
          timestamp: new Date().toISOString() 
        });
      } finally {
        sendEvent('done', { message: 'Stream ended', timestamp: new Date().toISOString() });
        writer.close();
      }
    })();

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Stream setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start stream' },
      { status: 500 }
    );
  }
} 