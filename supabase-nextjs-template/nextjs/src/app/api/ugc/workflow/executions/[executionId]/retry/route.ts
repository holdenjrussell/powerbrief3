import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const supabase = await createClient();
    const { executionId } = params;

    if (!executionId) {
      return NextResponse.json({ error: 'Execution ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the workflow execution status to running and clear error
    const { error: updateError } = await supabase
      .from('ugc_workflow_executions')
      .update({ 
        status: 'running',
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .eq('status', 'failed'); // Only retry if currently failed

    if (updateError) {
      console.error('Error retrying workflow execution:', updateError);
      return NextResponse.json({ error: 'Failed to retry workflow execution' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow execution retry initiated successfully' 
    });
  } catch (error) {
    console.error('Error in retry workflow API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}