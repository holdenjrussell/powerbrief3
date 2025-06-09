import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const supabase = await createClient();
    const { reviewId } = params;
    const { action, resolution_notes } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    if (!action || !['complete', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'Valid action is required (complete or skip)' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the review item to ensure it exists and user has access
    const { data: reviewItem, error: fetchError } = await supabase
      .from('ugc_human_intervention_queue')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !reviewItem) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    // Update the review item
    const updateData = {
      status: action === 'complete' ? 'completed' : 'skipped',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
      resolution_notes: resolution_notes || null
    };

    const { error: updateError } = await supabase
      .from('ugc_human_intervention_queue')
      .update(updateData)
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating review item:', updateError);
      return NextResponse.json({ error: 'Failed to update review item' }, { status: 500 });
    }

    // If completed, we should continue the workflow execution
    if (action === 'complete') {
      try {
        // Update the workflow execution to continue from the next step
        const { error: workflowError } = await supabase
          .from('ugc_workflow_executions')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewItem.execution_id);

        if (workflowError) {
          console.error('Error updating workflow execution:', workflowError);
          // Don't fail the request, just log the error
        }

        // Here you would typically trigger the workflow engine to continue
        // For now, we'll just update the status
        console.log(`Workflow ${reviewItem.execution_id} should continue from step ${reviewItem.step_id}`);
      } catch (workflowError) {
        console.error('Error continuing workflow:', workflowError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Review item ${action}d successfully` 
    });
  } catch (error) {
    console.error('Error in human review update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const { action_id, notes, brand_id } = await request.json();
    const reviewId = params.reviewId;

    if (!reviewId || !action_id || !brand_id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the review item
    const { data: reviewItem, error: fetchError } = await supabase
      .from('ugc_human_intervention_queue')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !reviewItem) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    // Update the review item status
    const { error: updateError } = await supabase
      .from('ugc_human_intervention_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        resolution_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating review item:', updateError);
      return NextResponse.json({ error: 'Failed to update review item' }, { status: 500 });
    }

    // Process the specific action based on action_id
    let actionResult = {};
    
    switch (action_id) {
      case 'approve':
      case 'approve_primary':
      case 'approve_next_steps':
      case 'approve_content':
        // Update creator status or script status based on context
        if (reviewItem.creator_id) {
          const statusUpdate = getStatusUpdateForAction(action_id);
          if (statusUpdate) {
            await supabase
              .from('ugc_creators')
              .update({ status: statusUpdate })
              .eq('id', reviewItem.creator_id);
          }
        }
        actionResult = { action: 'approved', status: 'success' };
        break;
        
      case 'reject':
      case 'reject_content':
        if (reviewItem.creator_id) {
          await supabase
            .from('ugc_creators')
            .update({ status: 'REJECTED' })
            .eq('id', reviewItem.creator_id);
        }
        actionResult = { action: 'rejected', status: 'success' };
        break;
        
      case 'assign_scripts':
        // This would trigger script assignment workflow
        actionResult = { action: 'script_assignment_triggered', status: 'success' };
        break;
        
      case 'send_contract':
        // This would trigger contract sending
        actionResult = { action: 'contract_sent', status: 'success' };
        break;
        
      case 'ship_product':
        if (reviewItem.creator_id) {
          await supabase
            .from('ugc_creators')
            .update({ product_shipped: true, product_shipment_status: 'Shipped' })
            .eq('id', reviewItem.creator_id);
        }
        actionResult = { action: 'product_shipped', status: 'success' };
        break;
        
      default:
        actionResult = { action: action_id, status: 'processed' };
    }

    // If there's a workflow execution, update its status
    if (reviewItem.workflow_execution_id) {
      await supabase
        .from('ugc_workflow_executions')
        .update({
          status: 'running', // Resume the workflow
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewItem.workflow_execution_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Review action processed successfully',
      result: actionResult
    });

  } catch (error) {
    console.error('Error processing review action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getStatusUpdateForAction(actionId: string): string | null {
  const statusMap: Record<string, string> = {
    'approve_primary': 'Primary Screen',
    'approve_next_steps': 'Approved for Next Steps',
    'approve_content': 'Content Approved'
  };
  
  return statusMap[actionId] || null;
}