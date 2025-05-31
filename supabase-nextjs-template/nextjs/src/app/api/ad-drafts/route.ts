import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { AdDraft, AppAdDraftStatus, AdCreativeStatus, SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';
import { Database } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';

// Interface for the expected structure of an ad_drafts table row
// This should align with your DB schema now for ad_drafts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AdDraftRowFromDB {
  id: string;
  ad_name: string;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_set_id: string | null;
  ad_set_name: string | null;
  destination_url: string | null;
  call_to_action: string | null;
  meta_status: string; // DB stores it as string, will cast to AdCreativeStatus
  app_status: string;  // DB stores it as string, will cast to AppAdDraftStatus
  ad_batch_id: string | null;
  ad_draft_assets: AdDraftAssetRowFromDB[]; // Nested assets
  // user_id and brand_id are not directly mapped back to AdDraft type, but used for query
  site_links?: SiteLink[];
  advantage_plus_creative?: AdvantageCreativeEnhancements;
  video_editor?: string | null;
  strategist?: string | null;
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
  thumbnail_url?: string | null; // Make optional for backwards compatibility
  thumbnail_timestamp?: number | null; // Timestamp in seconds where thumbnail was captured
}


// Interface for the row structure when inserting/upserting ad_drafts (subset of DB columns)
interface AdDraftInsertRow {
  id: string;
  user_id: string;
  brand_id: string;
  ad_batch_id?: string | null;
  ad_name: string;
  primary_text?: string | null;
  headline?: string | null;
  description?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  ad_set_id?: string | null;
  ad_set_name?: string | null;
  destination_url?: string | null;
  call_to_action?: string | null;
  meta_status: AdCreativeStatus;
  app_status: AppAdDraftStatus;
  // New Meta features
  site_links?: SiteLink[];
  advantage_plus_creative?: AdvantageCreativeEnhancements;
  // PowerBrief context
  video_editor?: string | null;
  strategist?: string | null;
}

// Interface for ad_draft_assets when inserting
interface AdDraftAssetInsertRow {
  ad_draft_id: string;
  name: string;
  supabase_url: string;
  type: 'image' | 'video';
  thumbnail_url?: string | null; // Add thumbnail URL field
  thumbnail_timestamp?: number | null; // Add timestamp field
  // meta_hash, meta_video_id, etc., are not set during initial save, but by launch API
}


export async function GET(req: NextRequest) {
  const supabase = await createSSRClient();
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');
  // Note: adBatchId is ignored - we load all drafts for the brand

  if (!brandId) {
    return NextResponse.json({ message: 'Brand ID is required.' }, { status: 400 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    // Always load ALL drafts for the brand (ignore batch filtering)
    console.log(`[API AD_DRAFTS GET] Loading all drafts for brand: ${brandId}, user: ${user.id}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase as any)
      .from('ad_drafts')
      .select(`
        id,
        ad_name,
        primary_text,
        headline,
        description,
        campaign_id,
        campaign_name,
        ad_set_id,
        ad_set_name,
        destination_url,
        call_to_action,
        meta_status,
        app_status,
        ad_batch_id,
        video_editor,
        strategist,
        ad_draft_assets (
          id,
          name,
          supabase_url,
          type,
          meta_hash,
          meta_video_id,
          meta_upload_error,
          thumbnail_url,
          thumbnail_timestamp
        ),
        site_links,
        advantage_plus_creative
      `)
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Note: We no longer filter by ad_batch_id - load all drafts for the brand

    const { data: draftsData, error: draftsError } = await query;

    if (draftsError) {
      console.error('[API AD_DRAFTS GET] Error fetching drafts:', draftsError);
      throw draftsError;
    }
    if (!draftsData) { // Handle case where draftsData might be null even without an error
      return NextResponse.json([], { status: 200 }); // Return empty array if no drafts found
    }

    console.log(`[API AD_DRAFTS GET] Found ${draftsData.length} drafts for brand ${brandId}`);
    
    // Log status breakdown for debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusBreakdown = draftsData.reduce((acc: any, draft: any) => {
      const status = draft.app_status || 'UNDEFINED';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[API AD_DRAFTS GET] Status breakdown:', statusBreakdown);

    // Explicitly type draftRow based on the expected structure from the database query
    // Note: Proper typing will work after the database migration is applied
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drafts: AdDraft[] = draftsData.map((draftRow: any) => ({
      id: draftRow.id,
      brandId: brandId, // Add brandId to the response object, it's used in the frontend context
      adName: draftRow.ad_name,
      primaryText: draftRow.primary_text || '',
      headline: draftRow.headline || undefined,
      description: draftRow.description || undefined,
      campaignId: draftRow.campaign_id || null,
      campaignName: draftRow.campaign_name || null,
      adSetId: draftRow.ad_set_id || null,
      adSetName: draftRow.ad_set_name || null,
      destinationUrl: draftRow.destination_url || '',
      callToAction: draftRow.call_to_action || '',
      status: draftRow.meta_status as AdCreativeStatus,
      appStatus: draftRow.app_status as AppAdDraftStatus,
      // PowerBrief context
      videoEditor: draftRow.video_editor || undefined,
      strategist: draftRow.strategist || undefined,
      assets: (draftRow.ad_draft_assets || []).map((assetRow: AdDraftAssetRowFromDB) => ({
        name: assetRow.name,
        supabaseUrl: assetRow.supabase_url,
        type: assetRow.type,
        thumbnailUrl: assetRow.thumbnail_url || undefined, // Include thumbnail URL if available
        thumbnailTimestamp: assetRow.thumbnail_timestamp || undefined, // Include thumbnail timestamp if available
        // aspectRatios is not stored/retrieved here
      })),
      // Include new Meta features
      siteLinks: draftRow.site_links || [],
      advantageCreative: draftRow.advantage_plus_creative || {
        inline_comment: false,
        image_templates: false,
        image_touchups: false,
        video_auto_crop: false,
        image_brightness_and_contrast: false,
        enhance_cta: false,
        text_optimizations: false,
        image_uncrop: false,
        adapt_to_placement: false,
        media_type_automation: false,
        product_extensions: false,
        description_automation: false,
        add_text_overlay: false,
        site_extensions: false,
        '3d_animation': false,
        translate_text: false
      }
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
    const { adDrafts, adBatchId }: { adDrafts: AdDraft[], adBatchId?: string } = await req.json();
    if (!Array.isArray(adDrafts) || adDrafts.length === 0) {
      return NextResponse.json({ message: 'No ad drafts provided or invalid format.' }, { status: 400 });
    }
    
    const results = [];

    for (const draft of adDrafts) {
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
        ad_batch_id: adBatchId || null, // Associate with ad batch if provided
        ad_name: draft.adName,
        primary_text: draft.primaryText || null,
        headline: draft.headline || null,
        description: draft.description || null,
        campaign_id: draft.campaignId || null,
        campaign_name: draft.campaignName || null,
        ad_set_id: draft.adSetId || null,
        ad_set_name: draft.adSetName || null,
        destination_url: draft.destinationUrl || null,
        call_to_action: draft.callToAction || null,
        meta_status: draft.status, 
        app_status: draft.appStatus || 'DRAFT',
        site_links: draft.siteLinks || [],
        advantage_plus_creative: draft.advantageCreative || {
          inline_comment: false,
          image_templates: false,
          image_touchups: false,
          video_auto_crop: false,
          image_brightness_and_contrast: false,
          enhance_cta: false,
          text_optimizations: false,
          image_uncrop: false,
          adapt_to_placement: false,
          media_type_automation: false,
          product_extensions: false,
          description_automation: false,
          add_text_overlay: false,
          site_extensions: false,
          '3d_animation': false,
          translate_text: false
        },
        video_editor: draft.videoEditor || null,
        strategist: draft.strategist || null
      };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { data: upsertedDraft, error: draftError } = await (supabase as any)
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

      const { error: deleteAssetsError } = await (supabase as any)
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
          thumbnail_url: (asset as any).thumbnailUrl || null, // Include thumbnail URL if available
          thumbnail_timestamp: (asset as any).thumbnailTimestamp || null, // Include thumbnail timestamp if available
        }));
        const { error: insertAssetsError } = await (supabase as any)
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

    const { error: deleteError } = await (supabase as any)
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