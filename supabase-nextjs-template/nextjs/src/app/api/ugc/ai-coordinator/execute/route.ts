import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ugcAiCoordinator } from '@/lib/services/ugcAiCoordinator';

export async function POST(request: Request) {
  try {
    const { coordinatorId, action } = await request.json();

    if (!coordinatorId || !action) {
      return NextResponse.json({ error: 'Coordinator ID and action are required' }, { status: 400 });
    }

    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the coordinator belongs to the user
    const { data: coordinator, error: coordinatorError } = await supabase
      .from('ugc_ai_coordinator')
      .select('*')
      .eq('id', coordinatorId)
      .eq('user_id', user.id)
      .single();

    if (coordinatorError || !coordinator) {
      return NextResponse.json({ error: 'Coordinator not found or access denied' }, { status: 404 });
    }

    // Execute the action
    const result = await ugcAiCoordinator.executeAction(coordinatorId, action);

    // Send Slack notification if enabled
    if (coordinator.slack_notifications_enabled && result.success) {
      try {
        await ugcAiCoordinator.sendSlackUpdate(
          action.brand.id,
          `✅ Action executed: ${action.type} for creator ${action.creator.name}`,
          {
            action: action.type,
            creator: action.creator.name,
            result: result.message
          }
        );
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
        // Don't fail the request for Slack notification failures
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error executing action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
} 