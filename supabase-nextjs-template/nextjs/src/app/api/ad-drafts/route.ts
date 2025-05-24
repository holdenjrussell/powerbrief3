import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { AdDraft, AppAdDraftStatus, AdCreativeStatus } from '@/components/ad-upload-tool/adUploadTypes';
import { Database } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';

// Interface for the expected structure of an ad_drafts table row
// This should align with your DB schema now for ad_drafts
interface AdDraftRowFromDB {
  id: string;
  ad_name: string;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  campaign_id: string | null;
  ad_set_id: string | null;
  destination_url: string | null;
  call_to_action: string | null;
  meta_status: string; // DB stores it as string, will cast to AdCreativeStatus
  app_status: string;  // DB stores it as string, will cast to AppAdDraftStatus
  ad_draft_assets: AdDraftAssetRowFromDB[]; // Nested assets
  // user_id and brand_id are not directly mapped back to AdDraft type, but used for query
}

// Interface for ad_draft_assets table row from DB
interface AdDraftAssetRowFromDB {
  id: string; // Assuming asset ID from DB might be useful
  name: string;
  supabase_url: string;
  type: 'image' | 'video';
  meta_hash: string | null;
  meta_video_id: string | null;
  meta_upload_error: string | null;
}


// Interface for the row structure when inserting/upserting ad_drafts (subset of DB columns)
interface AdDraftInsertRow {
  id: string;
  user_id: string;
  brand_id: string;
  ad_name: string;
  primary_text?: string | null;
  headline?: string | null;
  description?: string | null;
  campaign_id?: string | null;
  ad_set_id?: string | null;
  destination_url?: string | null;
  call_to_action?: string | null;
  meta_status: AdCreativeStatus;
  app_status: AppAdDraftStatus;
}

// Interface for ad_draft_assets when inserting
interface AdDraftAssetInsertRow {
  ad_draft_id: string;
  name: string;
  supabase_url: string;
  type: 'image' | 'video';
  // meta_hash, meta_video_id, etc., are not set during initial save, but by launch API
}


export async function GET(req: NextRequest) {
  const supabase = await createSSRClient();
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');

  if (!brandId) {
    return NextResponse.json({ message: 'Brand ID is required.' }, { status: 400 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    // Supabase types should now correctly infer draftsData type if supabase.ts is updated
    const { data: draftsData, error: draftsError } = await supabase
      .from('ad_drafts')
      .select(`
        id,
        ad_name,
        primary_text,
        headline,
        description,
        campaign_id,
        ad_set_id,
        destination_url,
        call_to_action,
        meta_status,
        app_status,
        ad_draft_assets (
          id,
          name,
          supabase_url,
          type,
          meta_hash,
          meta_video_id,
          meta_upload_error
        )
      `)
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (draftsError) {
      console.error('[API AD_DRAFTS GET] Error fetching drafts:', draftsError);
      throw draftsError;
    }
    if (!draftsData) { // Handle case where draftsData might be null even without an error
      return NextResponse.json([], { status: 200 }); // Return empty array if no drafts found
    }

    // Explicitly type draftRow based on the expected structure from the database query
    const drafts: AdDraft[] = draftsData.map((draftRow: AdDraftRowFromDB) => ({
      id: draftRow.id,
      brandId: brandId, // Add brandId to the response object, it's used in the frontend context
      adName: draftRow.ad_name,
      primaryText: draftRow.primary_text || '',
      headline: draftRow.headline || undefined,
      description: draftRow.description || undefined,
      campaignId: draftRow.campaign_id || null,
      adSetId: draftRow.ad_set_id || null,
      destinationUrl: draftRow.destination_url || '',
      callToAction: draftRow.call_to_action || '',
      status: draftRow.meta_status as AdCreativeStatus,
      appStatus: draftRow.app_status as AppAdDraftStatus,
      assets: draftRow.ad_draft_assets.map((assetRow: AdDraftAssetRowFromDB) => ({
        name: assetRow.name,
        supabaseUrl: assetRow.supabase_url,
        type: assetRow.type,
        // aspectRatios is not stored/retrieved here
      })),
    }));

    return NextResponse.json(drafts, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('[API AD_DRAFTS GET] Catch Error:', errorMessage);
    return NextResponse.json({ message: 'Failed to fetch ad drafts.', error: errorMessage }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  const supabase: SupabaseClient<Database> = await createSSRClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const adDraftsToUpsert: AdDraft[] = await req.json();
    if (!Array.isArray(adDraftsToUpsert) || adDraftsToUpsert.length === 0) {
      return NextResponse.json({ message: 'No ad drafts provided or invalid format.' }, { status: 400 });
    }
    
    const results = [];

    for (const draft of adDraftsToUpsert) {
      if (!draft.brandId) { 
         console.warn('[API AD_DRAFTS POST] Draft missing brandId:', draft.adName);
         results.push({ id: draft.id, success: false, message: 'Draft missing brandId.'});
         continue;
      }

      // Construct the row for upserting into ad_drafts table
      const adDraftRowToUpsert: AdDraftInsertRow = {
        id: draft.id, 
        user_id: user.id, // user_id is part of AdDraftInsertRow now
        brand_id: draft.brandId,
        ad_name: draft.adName,
        primary_text: draft.primaryText || null,
        headline: draft.headline || null,
        description: draft.description || null,
        campaign_id: draft.campaignId || null,
        ad_set_id: draft.adSetId || null,
        destination_url: draft.destinationUrl || null,
        call_to_action: draft.callToAction || null,
        meta_status: draft.status, 
        app_status: draft.appStatus || 'DRAFT',
      };

      const { data: upsertedDraft, error: draftError } = await supabase
        .from('ad_drafts')
        .upsert(adDraftRowToUpsert) // Pass the fully typed object
        .select('id')
        .single();

      if (draftError) {
        console.error('[API AD_DRAFTS POST] Error upserting draft:', draft.adName, draftError);
        results.push({ id: draft.id, success: false, error: draftError.message });
        continue;
      }
      
      if (!upsertedDraft || !upsertedDraft.id) {
        console.error('[API AD_DRAFTS POST] Upserted draft but no ID returned:', draft.adName);
        results.push({ id: draft.id, success: false, error: 'Failed to get ID from upserted draft.' });
        continue;
      }
      
      const draftDbId = upsertedDraft.id;

      const { error: deleteAssetsError } = await supabase
        .from('ad_draft_assets')
        .delete()
        .eq('ad_draft_id', draftDbId);

      if (deleteAssetsError) {
        console.error('[API AD_DRAFTS POST] Error deleting old assets for draft:', draft.adName, deleteAssetsError);
        results.push({ id: draft.id, success: false, error: `Failed to clear old assets: ${deleteAssetsError.message}` });
        continue;
      }

      if (draft.assets && draft.assets.length > 0) {
        const assetRows: AdDraftAssetInsertRow[] = draft.assets.map(asset => ({
          ad_draft_id: draftDbId,
          name: asset.name,
          supabase_url: asset.supabaseUrl,
          type: asset.type,
        }));
        const { error: insertAssetsError } = await supabase
          .from('ad_draft_assets')
          .insert(assetRows);

        if (insertAssetsError) {
          console.error('[API AD_DRAFTS POST] Error inserting assets for draft:', draft.adName, insertAssetsError);
          results.push({ id: draft.id, success: false, error: `Failed to insert assets: ${insertAssetsError.message}` });
          continue;
        }
      }
      results.push({ id: draftDbId, success: true });
    }

    return NextResponse.json({ message: 'Ad drafts processed.', results }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('[API AD_DRAFTS POST] Catch Error:', errorMessage);
    return NextResponse.json({ message: 'Failed to save ad drafts.', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSSRClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const { draftIds }: { draftIds: string[] } = await req.json();

    if (!Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({ message: 'No draft IDs provided for deletion.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('ad_drafts')
      .delete()
      .in('id', draftIds)
      .eq('user_id', user.id); 

    if (deleteError) {
      console.error('[API AD_DRAFTS DELETE] Error deleting drafts:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ message: 'Selected ad drafts deleted successfully.' }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('[API AD_DRAFTS DELETE] Catch Error:', errorMessage);
    return NextResponse.json({ message: 'Failed to delete ad drafts.', error: errorMessage }, { status: 500 });
  }
} 