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
      .select('id, user_id, revision_count')
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

    // Increment the revision count
    const newRevisionCount = (concept.revision_count || 1) + 1;

    const { data: updatedConcept, error: updateError } = await serviceSupabase
      .from('brief_concepts')
      .update({
        revision_count: newRevisionCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating concept revision count:', updateError);
      return NextResponse.json({ error: 'Failed to update concept' }, { status: 500 });
    }

    return NextResponse.json({ 
      concept: updatedConcept,
      message: `Concept revision incremented to v${newRevisionCount}` 
    });
  } catch (error) {
    console.error('Error in concept-revision POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 