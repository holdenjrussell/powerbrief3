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

    // Get the existing comment and verify access permissions
    const { data: existingComment, error: fetchError } = await serviceSupabase
      .from('concept_comments')
      .select(`
        *,
        brief_concepts!inner(
          user_id,
          brief_batches!inner(
            brand_id,
            brands!inner(
              user_id,
              shared_users
            )
          )
        )
      `)
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      console.error('Error fetching comment:', fetchError);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user has permission to resolve comments
    // Allow if user is:
    // 1. The concept owner
    // 2. The brand owner
    // 3. A shared user on the brand
    const concept = existingComment.brief_concepts;
    const brand = concept.brief_batches.brands;
    
    const isConceptOwner = concept.user_id === user.id;
    const isBrandOwner = brand.user_id === user.id;
    const isSharedUser = brand.shared_users && 
      Array.isArray(brand.shared_users) && 
      brand.shared_users.some((sharedUser: { user_id: string }) => sharedUser.user_id === user.id);

    if (!isConceptOwner && !isBrandOwner && !isSharedUser) {
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