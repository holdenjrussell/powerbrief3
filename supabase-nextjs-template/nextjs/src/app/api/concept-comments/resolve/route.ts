import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSSRClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, isResolved } = body;

    if (!commentId || typeof isResolved !== 'boolean') {
      return NextResponse.json({ 
        error: 'Comment ID and resolution status are required' 
      }, { status: 400 });
    }

    // Create server-side client for authentication
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ 
        error: 'Authentication required to resolve comments' 
      }, { status: 401 });
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the existing comment and verify concept ownership
    const { data: existingComment, error: fetchError } = await serviceSupabase
      .from('concept_comments')
      .select(`
        *,
        brief_concepts!inner(user_id)
      `)
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns the concept
    if (existingComment.brief_concepts.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Not authorized to resolve comments on this concept' 
      }, { status: 403 });
    }

    // Update resolution status
    const updateData: Record<string, string | boolean | null> = {
      is_resolved: isResolved,
      updated_at: new Date().toISOString()
    };

    if (isResolved) {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    } else {
      updateData.resolved_at = null;
      updateData.resolved_by = null;
    }

    const { data: updatedComment, error: updateError } = await serviceSupabase
      .from('concept_comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment resolution:', updateError);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('Error in concept-comments resolve PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 