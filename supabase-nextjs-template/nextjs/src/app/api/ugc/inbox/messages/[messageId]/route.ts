import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// PATCH - Restore or update email message
export async function PATCH(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const { messageId } = params;
    const body = await request.json();
    const { action } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    if (action === 'restore') {
      // Restore deleted message
      const { error } = await supabase
        .from('ugc_email_messages')
        .update({ 
          deleted_at: null, 
          deleted_by: null 
        })
        .eq('id', messageId)
        .not('deleted_at', 'is', null);

      if (error) {
        console.error('Error restoring message:', error);
        return NextResponse.json({ error: 'Failed to restore message' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Message restored successfully' });
    }

    // For other updates (like status changes)
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.subject) updateData.subject = body.subject;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data: message, error } = await supabase
      .from('ugc_email_messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json(message);

  } catch (error) {
    console.error('Message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete email message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const { messageId } = params;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Soft delete the message using the database function
    const { data, error } = await supabase.rpc('delete_email_message', {
      p_message_id: messageId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Message not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 