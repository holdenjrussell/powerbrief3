import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch workflow executions using the view that includes computed fields
    const { data: executions, error } = await supabase
      .from('ugc_workflow_execution_view')
      .select(`
        id,
        workflow_id,
        creator_id,
        brand_id,
        current_step_id,
        status,
        started_at,
        completed_at,
        error_message,
        context,
        created_at,
        updated_at,
        completion_percentage,
        completed_steps,
        total_steps,
        current_step_name
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflow executions:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow executions' }, { status: 500 });
    }

    // Fetch additional data for each execution
    const executionsWithDetails = await Promise.all(
      (executions || []).map(async (execution) => {
        // Get workflow name
        const { data: workflow } = await supabase
          .from('ugc_workflow_templates')
          .select('name')
          .eq('id', execution.workflow_id)
          .single();

        // Get creator details
        const { data: creator } = await supabase
          .from('ugc_creators')
          .select('name, email')
          .eq('id', execution.creator_id)
          .single();

        return {
          ...execution,
          workflow_name: workflow?.name || 'Unknown Workflow',
          creator_name: creator?.name || 'Unknown Creator',
          creator_email: creator?.email || 'Unknown Email'
        };
      })
    );

    return NextResponse.json({ executions: executionsWithDetails });
  } catch (error) {
    console.error('Error in workflow executions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}