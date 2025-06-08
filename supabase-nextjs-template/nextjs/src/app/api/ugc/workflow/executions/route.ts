import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get workflow executions for the brand
    const { data: executions, error } = await supabase
      .from('ugc_workflow_executions')
      .select(`
        id,
        workflow_id,
        creator_id,
        status,
        trigger_event,
        started_at,
        completed_at,
        current_step,
        total_steps,
        completed_steps,
        context,
        ugc_workflow_templates!inner(name, brand_id),
        ugc_creators!inner(name, email)
      `)
      .eq('ugc_workflow_templates.brand_id', brandId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching workflow executions:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow executions' }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedExecutions = executions?.map(execution => ({
      id: execution.id,
      workflow_name: execution.ugc_workflow_templates?.name || 'Unknown Workflow',
      creator_id: execution.creator_id,
      creator_name: execution.ugc_creators?.name || execution.ugc_creators?.email || 'Unknown Creator',
      status: execution.status,
      trigger_event: execution.trigger_event,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      current_step: execution.current_step,
      total_steps: execution.total_steps,
      completed_steps: execution.completed_steps,
      context: execution.context || {}
    })) || [];

    return NextResponse.json(transformedExecutions);
  } catch (error) {
    console.error('Error in workflow executions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}