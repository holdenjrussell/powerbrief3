import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get('conceptId');

    if (!conceptId) {
      return NextResponse.json({ error: 'Concept ID is required' }, { status: 400 });
    }

    // Use service role client for reading comments (no auth required for reading)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch comments for the concept, including replies
    const { data: comments, error } = await serviceSupabase
      .from('concept_comments')
      .select('*')
      .eq('concept_id', conceptId)
      .order('timestamp_seconds', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Error in concept-comments GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conceptId, timestamp, comment, shareId, parentId, commenterName, commenterEmail } = body;

    if (!conceptId || typeof timestamp !== 'number' || !comment?.trim()) {
      return NextResponse.json({ 
        error: 'Concept ID, timestamp, and comment are required' 
      }, { status: 400 });
    }

    // Create server-side client for authentication
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let authorName = 'Anonymous';
    let authorEmail = null;
    let userId = null;

    if (user && !authError) {
      // Authenticated user
      authorName = user.email || 'Authenticated User';
      authorEmail = user.email;
      userId = user.id;
    } else if (shareId) {
      // Unauthenticated user on shared page - use service role client
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Verify the concept is actually shared
      const { data: batchData, error: batchError } = await serviceSupabase
        .from('brief_batches')
        .select('id')
        .contains('share_settings', { [shareId]: {} });

      if (batchError || !batchData || batchData.length === 0) {
        return NextResponse.json({ 
          error: 'Invalid share link or concept not accessible' 
        }, { status: 403 });
      }

      // Use provided name and email for public comments
      if (commenterName && commenterEmail) {
        authorName = `${commenterName} (${commenterEmail})`;
        authorEmail = commenterEmail;
      } else {
        authorName = 'Anonymous Reviewer';
      }

      // Insert comment using service role client for unauthenticated users
      const { data: newComment, error: insertError } = await serviceSupabase
        .from('concept_comments')
        .insert({
          concept_id: conceptId,
          user_id: null,
          author_name: authorName,
          author_email: authorEmail,
          timestamp_seconds: timestamp,
          comment_text: comment.trim(),
          parent_id: parentId || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting comment (unauthenticated):', insertError);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
      }

      return NextResponse.json({ comment: newComment });
    } else {
      return NextResponse.json({ 
        error: 'Authentication required or valid share link needed' 
      }, { status: 401 });
    }

    // For authenticated users, use service role client to bypass RLS
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: newComment, error: insertError } = await serviceSupabase
      .from('concept_comments')
      .insert({
        concept_id: conceptId,
        user_id: userId,
        author_name: authorName,
        author_email: authorEmail,
        timestamp_seconds: timestamp,
        comment_text: comment.trim(),
        parent_id: parentId || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting comment (authenticated):', insertError);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: newComment });
  } catch (error) {
    console.error('Error in concept-comments POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, comment, shareId } = body;

    if (!commentId || !comment?.trim()) {
      return NextResponse.json({ 
        error: 'Comment ID and comment text are required' 
      }, { status: 400 });
    }

    // Create server-side client for authentication
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the existing comment to check ownership
    const { data: existingComment, error: fetchError } = await serviceSupabase
      .from('concept_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user can edit this comment
    let canEdit = false;
    if (user && !authError && existingComment.user_id === user.id) {
      canEdit = true;
    } else if (shareId && !existingComment.user_id) {
      // Anonymous comment on shared page - allow editing
      canEdit = true;
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Not authorized to edit this comment' }, { status: 403 });
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await serviceSupabase
      .from('concept_comments')
      .update({
        comment_text: comment.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('Error in concept-comments PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');
    const shareId = searchParams.get('shareId');

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Create server-side client for authentication
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the existing comment to check ownership
    const { data: existingComment, error: fetchError } = await serviceSupabase
      .from('concept_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user can delete this comment
    let canDelete = false;
    if (user && !authError && existingComment.user_id === user.id) {
      canDelete = true;
    } else if (shareId && !existingComment.user_id) {
      // Anonymous comment on shared page - allow deleting
      canDelete = true;
    }

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
    }

    // Delete the comment and its replies
    const { error: deleteError } = await serviceSupabase
      .from('concept_comments')
      .delete()
      .or(`id.eq.${commentId},parent_id.eq.${commentId}`);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in concept-comments DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 