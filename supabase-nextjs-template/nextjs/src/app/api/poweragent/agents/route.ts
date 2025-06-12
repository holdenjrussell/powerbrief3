import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get brand_id from query params
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brand_id');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Fetch agents for the brand
    const { data: agents, error } = await supabase
      .from('poweragent_agents')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error in GET /api/poweragent/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brand_id, ...agentData } = body;

    if (!brand_id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Create the agent
    const { data: agent, error } = await supabase
      .from('poweragent_agents')
      .insert({
        brand_id,
        name: agentData.name,
        purpose: agentData.purpose,
        instructions: agentData.instructions,
        provider: agentData.provider,
        model: agentData.model,
        config: {
          description: agentData.description,
          markdown: agentData.markdown,
          selectedTools: agentData.selectedTools,
          customTools: agentData.customTools,
          toolkits: agentData.toolkits,
          memory: agentData.memory,
          retrievers: agentData.retrievers,
          conversation: agentData.conversation,
          voice: agentData.voice,
          hooks: agentData.hooks,
          subAgents: agentData.subAgents,
          workflow: agentData.workflow,
        },
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error in POST /api/poweragent/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 