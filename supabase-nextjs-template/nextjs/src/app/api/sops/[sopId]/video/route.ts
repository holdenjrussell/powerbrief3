import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sopId: string } }
) {
  try {
    const supabase = await createClient();
    const { sopId } = params;

    // Get the active video for this SOP
    const { data: video, error } = await supabase
      .from('sop_videos')
      .select('*')
      .eq('sop_id', sopId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[SOP Video Get] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
    }

    if (!video) {
      return NextResponse.json({ video: null });
    }

    return NextResponse.json({ video });

  } catch (error) {
    console.error('[SOP Video Get] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sopId: string } }
) {
  try {
    const supabase = await createClient();
    const { sopId } = params;

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the active video for this SOP
    const { data: video, error: fetchError } = await supabase
      .from('sop_videos')
      .select('*')
      .eq('sop_id', sopId)
      .eq('is_active', true)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'No active video found' }, { status: 404 });
      }
      console.error('[SOP Video Delete] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
    }

    // Check if user owns this video or is service role
    if (video.uploaded_by !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('powerbrief-media')
      .remove([video.file_name]);

    if (storageError) {
      console.error('[SOP Video Delete] Storage delete error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('sop_videos')
      .delete()
      .eq('id', video.id);

    if (dbError) {
      console.error('[SOP Video Delete] Database error:', dbError);
      return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[SOP Video Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}