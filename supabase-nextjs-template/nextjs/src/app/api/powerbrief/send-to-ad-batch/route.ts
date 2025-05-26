import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conceptId } = await req.json();

    if (!conceptId) {
      return NextResponse.json({ message: 'Missing concept ID.' }, { status: 400 });
    }

    // First, try to get the concept with basic fields to check if it exists
    const { data: basicConcept, error: basicError } = await supabaseAdmin
      .from('brief_concepts')
      .select(`
        id,
        concept_title,
        brief_batches:brief_batch_id (
          id,
          name,
          brand_id,
          user_id
        )
      `)
      .eq('id', conceptId)
      .single();

    if (basicError || !basicConcept) {
      console.error('Error fetching concept:', basicError);
      return NextResponse.json({ message: 'Concept not found.' }, { status: 404 });
    }

    // Now try to get the uploaded_assets
    const { data: conceptWithAssets, error: assetsError } = await supabaseAdmin
      .from('brief_concepts')
      .select('uploaded_assets')
      .eq('id', conceptId)
      .single();

    if (assetsError) {
      console.error('Error fetching uploaded_assets:', assetsError);
      return NextResponse.json({ message: 'Failed to fetch concept assets.' }, { status: 500 });
    }

    // Type the concept data properly
    const uploadedAssets = conceptWithAssets?.uploaded_assets as unknown as UploadedAssetGroup[] | null;

    if (!uploadedAssets || uploadedAssets.length === 0) {
      return NextResponse.json({ message: 'No assets to send.' }, { status: 400 });
    }

    // Get brand_id and user_id from the concept's brief_batch
    const brandId = basicConcept.brief_batches?.brand_id;
    const userId = basicConcept.brief_batches?.user_id;

    if (!brandId || !userId) {
      return NextResponse.json({ message: 'Could not determine brand or user from concept.' }, { status: 400 });
    }

    // Convert PowerBrief assets to ad drafts (without batch association)
    const createdDrafts = [];

    for (const group of uploadedAssets) {
      // Create an ad draft for each asset group
      const adDraftData = {
        user_id: userId,
        brand_id: brandId,
        ad_batch_id: null, // No batch association
        ad_name: `${basicConcept.concept_title} - ${group.baseName}`,
        primary_text: `Creative assets from PowerBrief concept: ${basicConcept.concept_title}`,
        headline: basicConcept.concept_title,
        description: `Assets: ${group.aspectRatios?.join(', ') || 'Multiple formats'}`,
        meta_status: 'DRAFT',
        app_status: 'DRAFT', // Mark as ready for upload
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdDraft, error: draftError } = await supabaseAdmin
        .from('ad_drafts')
        .insert(adDraftData)
        .select('id')
        .single();

      if (draftError) {
        console.error('Error creating ad draft:', draftError);
        continue; // Skip this group but continue with others
      }

      // Create ad_draft_assets for each asset in the group
      const assetInserts = group.assets.map((asset) => ({
        ad_draft_id: createdDraft.id,
        name: asset.name,
        supabase_url: asset.supabaseUrl,
        type: asset.type,
        created_at: new Date().toISOString()
      }));

      const { error: assetsError } = await supabaseAdmin
        .from('ad_draft_assets')
        .insert(assetInserts);

      if (assetsError) {
        console.error('Error creating ad draft assets:', assetsError);
        // Consider whether to delete the draft if assets fail
      } else {
        createdDrafts.push({
          id: createdDraft.id,
          name: adDraftData.ad_name,
          assetCount: group.assets.length
        });
      }
    }

    // Update the concept to mark it as sent
    const { error: conceptUpdateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        asset_upload_status: 'sent_to_ad_upload',
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (conceptUpdateError) {
      console.error('Error updating concept:', conceptUpdateError);
      return NextResponse.json({ message: 'Failed to update concept.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Assets sent to ad upload tool successfully',
      createdDrafts: createdDrafts,
      totalDrafts: createdDrafts.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error in send-to-ad-upload API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 