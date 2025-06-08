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

    // Get human review items for the brand
    const { data: reviewItems, error } = await supabase
      .from('ugc_human_intervention_queue')
      .select(`
        id,
        workflow_execution_id,
        creator_id,
        intervention_type,
        title,
        description,
        priority,
        status,
        context,
        created_at,
        ugc_creators!inner(name, email, brand_id)
      `)
      .eq('ugc_creators.brand_id', brandId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching human review items:', error);
      return NextResponse.json({ error: 'Failed to fetch human review items' }, { status: 500 });
    }

    // Transform the data for the frontend
    const transformedReviewItems = reviewItems?.map(item => ({
      id: item.id,
      workflow_execution_id: item.workflow_execution_id,
      creator_id: item.creator_id,
      creator_name: item.ugc_creators?.name || item.ugc_creators?.email || 'Unknown Creator',
      review_type: item.intervention_type,
      title: item.title,
      description: item.description,
      priority: item.priority || 'medium',
      created_at: item.created_at,
      context: item.context || {},
      actions: getActionsForReviewType(item.intervention_type)
    })) || [];

    return NextResponse.json(transformedReviewItems);
  } catch (error) {
    console.error('Error in human review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getActionsForReviewType(reviewType: string) {
  const actionMap: Record<string, Array<{ id: string; label: string; action_type: string; data?: Record<string, any> }>> = {
    creator_approval: [
      { id: 'approve', label: 'Approve Creator', action_type: 'approve' },
      { id: 'reject', label: 'Reject Creator', action_type: 'reject' },
      { id: 'request_info', label: 'Request More Info', action_type: 'request_info' }
    ],
    script_assignment: [
      { id: 'assign', label: 'Assign Script', action_type: 'assign' },
      { id: 'reassign', label: 'Reassign to Different Creator', action_type: 'reassign' },
      { id: 'defer', label: 'Defer Assignment', action_type: 'defer' }
    ],
    rate_negotiation: [
      { id: 'accept_rate', label: 'Accept Proposed Rate', action_type: 'accept' },
      { id: 'counter_offer', label: 'Make Counter Offer', action_type: 'counter' },
      { id: 'escalate', label: 'Escalate to Manager', action_type: 'escalate' }
    ],
    content_review: [
      { id: 'approve_content', label: 'Approve Content', action_type: 'approve' },
      { id: 'request_revision', label: 'Request Revision', action_type: 'revision' },
      { id: 'reject_content', label: 'Reject Content', action_type: 'reject' }
    ],
    status_update: [
      { id: 'update_status', label: 'Update Status', action_type: 'update' },
      { id: 'skip', label: 'Skip This Step', action_type: 'skip' }
    ]
  };

  return actionMap[reviewType] || [
    { id: 'approve', label: 'Approve', action_type: 'approve' },
    { id: 'reject', label: 'Reject', action_type: 'reject' }
  ];
}