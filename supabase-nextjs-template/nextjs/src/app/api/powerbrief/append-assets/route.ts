import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';
import { sendConceptSubmissionNotification } from '@/lib/utils/slackNotifications';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConceptWithBatch {
  id: string;
  concept_title: string;
  video_editor?: string;
  brief_batches: {
    id: string;
    name: string;
    brand_id: string;
    brands: {
      id: string;
      name: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const { conceptId, assetGroups, shareId } = await req.json();

    if (!conceptId || !assetGroups || !Array.isArray(assetGroups)) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Add timestamps to new asset groups
    const timestampedAssetGroups: UploadedAssetGroup[] = assetGroups.map((group: UploadedAssetGroup) => ({
      ...group,
      uploadedAt: new Date().toISOString(),
      assets: group.assets.map((asset) => ({
        ...asset,
        uploadedAt: new Date().toISOString()
      }))
    }));

    // Get the current concept's existing assets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentConcept, error: fetchCurrentError } = await supabaseAdmin
      .from('brief_concepts' as any)
      .select('uploaded_assets')
      .eq('id', conceptId)
      .single();

    if (fetchCurrentError) {
      console.error('Error fetching current concept assets:', fetchCurrentError);
      return NextResponse.json({ message: 'Failed to fetch current assets.' }, { status: 500 });
    }

    // Get concept details for Slack notification
    const { data: conceptData, error: fetchError } = await supabaseAdmin
      .from('brief_concepts' as keyof Database['public']['Tables'])
      .select(`
        id,
        concept_title,
        video_editor,
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
      .single();

    if (fetchError) {
      console.error('Error fetching concept for notification:', fetchError);
    }

    // Combine existing assets with new assets
    const existingAssets = (currentConcept?.uploaded_assets as UploadedAssetGroup[]) || [];
    const combinedAssets = [...existingAssets, ...timestampedAssetGroups];

    // Update the concept with the combined assets
    const { error: updateError } = await supabaseAdmin
      .from('brief_concepts' as keyof Database['public']['Tables'])
      .update({
        uploaded_assets: combinedAssets,
        asset_upload_status: 'uploaded',
        review_status: 'ready_for_review',
        status: 'READY FOR REVIEW',
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (updateError) {
      console.error('Error updating concept with appended assets:', updateError);
      return NextResponse.json({ message: 'Failed to save assets.' }, { status: 500 });
    }

    // Send Slack notification for additional asset upload
    if (conceptData) {
      try {
        const typedConceptData = conceptData as unknown as ConceptWithBatch;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const publicShareUrl = shareId 
          ? `${baseUrl}/public/concept/${shareId}/${conceptId}`
          : `${baseUrl}/app/reviews`;
        const reviewDashboardUrl = `${baseUrl}/app/reviews`;

        await sendConceptSubmissionNotification({
          brandId: typedConceptData.brief_batches.brand_id,
          conceptId: conceptId,
          conceptTitle: typedConceptData.concept_title,
          batchName: typedConceptData.brief_batches.name,
          videoEditor: typedConceptData.video_editor,
          reviewLink: undefined, // No Frame.io link for uploaded assets
          publicShareUrl: publicShareUrl,
          reviewDashboardUrl: reviewDashboardUrl,
          hasUploadedAssets: true
        });
      } catch (slackError) {
        console.error('Failed to send Slack notification for appended assets:', slackError);
        // Don't fail the upload if Slack notification fails
      }
    }

    return NextResponse.json({ 
      message: 'Additional assets appended successfully',
      assetGroups: combinedAssets,
      newAssetsCount: timestampedAssetGroups.length,
      totalAssetsCount: combinedAssets.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error in append-assets API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 