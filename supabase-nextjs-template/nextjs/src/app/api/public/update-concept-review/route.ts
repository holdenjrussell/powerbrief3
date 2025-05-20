import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types';
import { DbBriefConcept, ShareSettings } from '@/lib/types/powerbrief';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { conceptId, shareId, reviewLink } = await request.json();

    // Validate required fields
    if (!conceptId || !shareId || !reviewLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify that this share ID is valid for this concept
    const { data: concept, error: getError } = await supabaseAdmin
      .from('brief_concepts')
      .select('*')
      .eq('id', conceptId)
      .contains('share_settings', { [shareId]: {} })
      .single();

    if (getError || !concept) {
      console.error('Error verifying concept access:', getError);
      return NextResponse.json(
        { error: 'Unauthorized or concept not found' },
        { status: 403 }
      );
    }

    // Convert to properly typed object
    const typedConcept = concept as unknown as DbBriefConcept;
    
    // Verify the share settings allow editing
    const shareSettings = typedConcept.share_settings?.[shareId] as ShareSettings;
    if (!shareSettings || !shareSettings.is_editable) {
      return NextResponse.json(
        { error: 'This share link does not have edit permissions' },
        { status: 403 }
      );
    }

    // Update the concept with admin permissions
    const { data: updatedConcept, error: updateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        review_status: 'ready_for_review',
        review_link: reviewLink,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating concept review status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update review status' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedConcept);
  } catch (error) {
    console.error('Error in update-concept-review API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 