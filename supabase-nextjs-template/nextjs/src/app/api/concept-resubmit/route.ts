import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conceptId } = body;

    if (!conceptId) {
      return NextResponse.json({ 
        error: 'Concept ID is required' 
      }, { status: 400 });
    }

    // Create server-side client for authentication
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the current concept and verify ownership
    const { data: concept, error: fetchError } = await serviceSupabase
      .from('brief_concepts')
      .select('id, user_id, revision_count, review_status')
      .eq('id', conceptId)
      .single();

    if (fetchError || !concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Check if user owns the concept
    if (concept.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'Not authorized to update this concept' 
      }, { status: 403 });
    }

    // Only increment revision if the concept was previously marked for revisions
    let newRevisionCount = concept.revision_count || 1;
    let shouldIncrementRevision = false;

    // Check if this is a resubmission after revisions
    if (concept.review_status === 'needs_revisions' || 
        concept.review_status === 'needs_additional_sizes') {
      newRevisionCount = (concept.revision_count || 1) + 1;
      shouldIncrementRevision = true;
    }

    // Update the concept with new revision count and status
    const updateData: Record<string, string | number> = {
      review_status: 'ready_for_review',
      updated_at: new Date().toISOString()
    };

    if (shouldIncrementRevision) {
      updateData.revision_count = newRevisionCount;
    }

    const { data: updatedConcept, error: updateError } = await serviceSupabase
      .from('brief_concepts')
      .update(updateData)
      .eq('id', conceptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating concept for resubmission:', updateError);
      return NextResponse.json({ error: 'Failed to update concept' }, { status: 500 });
    }

    return NextResponse.json({ 
      concept: updatedConcept,
      revisionIncremented: shouldIncrementRevision,
      newRevision: shouldIncrementRevision ? newRevisionCount : concept.revision_count || 1,
      message: shouldIncrementRevision 
        ? `Concept resubmitted as revision v${newRevisionCount}` 
        : 'Concept resubmitted'
    });
  } catch (error) {
    console.error('Error in concept-resubmit POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 