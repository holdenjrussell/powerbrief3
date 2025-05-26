import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types';
import { DbBriefConcept, ShareSettings, UploadedAssetGroup } from '@/lib/types/powerbrief';
import { sendConceptSubmissionNotification } from '@/lib/utils/slackNotifications';

// Create a Supabase client with the service role key for admin access
// Making sure environment variables are properly loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check for missing environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables for Supabase client:');
  console.error(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'set' : 'missing'}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'set' : 'missing'}`);
}

const supabaseAdmin = createClient<Database>(
  supabaseUrl!,
  supabaseServiceKey!
);

interface ConceptWithBatch extends DbBriefConcept {
  brief_batches: {
    id: string;
    name: string;
    brand_id: string;
    brands: {
      id: string;
      name: string;
    };
  };
  uploaded_assets?: UploadedAssetGroup[];
}

export async function POST(request: NextRequest) {
  try {
    // Log environment variables availability for debugging
    console.log('API route environment check:');
    console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'available' : 'missing'}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'available' : 'missing'}`);
    
    const { conceptId, shareId, reviewLink } = await request.json();

    // Validate required fields
    if (!conceptId || !shareId || !reviewLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify that this share ID is valid for this concept and get related data
    const { data: concept, error: getError } = await supabaseAdmin
      .from('brief_concepts' as keyof Database['public']['Tables'])
      .select(`
        *,
        brief_batches!inner (
          id,
          name,
          brand_id,
          brands!inner (
            id,
            name
          )
        )
      `)
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
    const typedConcept = concept as unknown as ConceptWithBatch;
    
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
      .from('brief_concepts' as keyof Database['public']['Tables'])
      .update({
        review_status: 'ready_for_review',
        status: 'READY FOR REVIEW',
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

    // Send Slack notification for concept submission
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const publicShareUrl = `${baseUrl}/public/concept/${shareId}/${conceptId}`;
      const reviewDashboardUrl = `${baseUrl}/app/reviews`;

      await sendConceptSubmissionNotification({
        brandId: typedConcept.brief_batches.brand_id,
        conceptId: conceptId,
        conceptTitle: typedConcept.concept_title,
        batchName: typedConcept.brief_batches.name,
        videoEditor: typedConcept.video_editor,
        reviewLink: reviewLink,
        publicShareUrl: publicShareUrl,
        reviewDashboardUrl: reviewDashboardUrl,
        hasUploadedAssets: Boolean(typedConcept.uploaded_assets && typedConcept.uploaded_assets.length > 0)
      });
    } catch (slackError) {
      console.error('Failed to send Slack notification for concept submission:', slackError);
      // Don't fail the entire request if Slack notification fails
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