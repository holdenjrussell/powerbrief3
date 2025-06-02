import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';
import { AdConfigurationSettings } from '@/lib/types/adConfigurations';

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
        video_editor,
        strategist,
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
    const uploadedAssets = (conceptWithAssets as unknown as { uploaded_assets: UploadedAssetGroup[] })?.uploaded_assets || null;

    if (!uploadedAssets || uploadedAssets.length === 0) {
      return NextResponse.json({ message: 'No assets to send.' }, { status: 400 });
    }

    // Get brand_id and user_id from the concept's brief_batch
    const brandId = basicConcept.brief_batches?.brand_id;
    const userId = basicConcept.brief_batches?.user_id;

    if (!brandId || !userId) {
      return NextResponse.json({ message: 'Could not determine brand or user from concept.' }, { status: 400 });
    }

    // Fetch user's default ad configuration for this brand
    let userSettings = null;
    try {
      // Look for default configuration first
      const { data: defaultConfig, error: configError } = await supabaseAdmin
        .from('ad_configurations')
        .select('settings')
        .eq('user_id', userId)
        .eq('brand_id', brandId)
        .eq('is_default', true)
        .single();

      if (!configError && defaultConfig) {
        const settings = defaultConfig.settings as unknown as AdConfigurationSettings;
        userSettings = {
          primaryText: settings.primaryText || 'Check out our latest offer!',
          headline: settings.headline || 'Amazing New Product',
          description: settings.description || '',
          destinationUrl: settings.destinationUrl || 'https://example.com',
          callToAction: settings.callToAction || 'LEARN_MORE',
          status: settings.status || 'PAUSED',
          urlParams: settings.urlParams || '',
          campaignId: settings.campaignId,
          campaignName: settings.campaignName,
          adSetId: settings.adSetId,
          adSetName: settings.adSetName,
          siteLinks: settings.siteLinks || [],
          advantageCreative: settings.advantageCreative || {}
        };
        
        // Validate that adSetId belongs to campaignId if both are set
        if (userSettings.campaignId && userSettings.adSetId) {
          console.log(`[SEND-TO-AD-BATCH] Validating ad set ${userSettings.adSetId} belongs to campaign ${userSettings.campaignId}`);
          // For now, we'll trust the saved configuration, but this could be enhanced with Meta API validation
          // If validation fails in the future, we could clear adSetId: userSettings.adSetId = null;
        }
        
        console.log(`[SEND-TO-AD-BATCH] Using default ad configuration for brand: ${brandId}`);
        console.log(`[SEND-TO-AD-BATCH] Campaign ID: ${userSettings.campaignId}, Ad Set ID: ${userSettings.adSetId}`);
      } else {
        // Fallback to ad_batches for backward compatibility
        const { data: adBatch, error: batchError } = await supabaseAdmin
          .from('ad_batches')
          .select('*')
          .eq('brand_id', brandId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('last_accessed_at', { ascending: false })
          .limit(1)
          .single();

        if (!batchError && adBatch) {
          userSettings = {
            primaryText: adBatch.primary_text || 'Check out our latest offer!',
            headline: adBatch.headline || 'Amazing New Product',
            description: adBatch.description || '',
            destinationUrl: adBatch.destination_url || 'https://example.com',
            callToAction: adBatch.call_to_action || 'LEARN_MORE',
            status: adBatch.status || 'PAUSED',
            urlParams: adBatch.url_params || '',
            campaignId: adBatch.campaign_id,
            campaignName: null, // Ad batches don't store names yet
            adSetId: adBatch.ad_set_id,
            adSetName: null, // Ad batches don't store names yet
            siteLinks: adBatch.site_links || [],
            advantageCreative: adBatch.advantage_plus_creative || {}
          };
          console.log(`[SEND-TO-AD-BATCH] Using existing ad batch settings for brand: ${brandId}`);
        }
      }
    } catch (settingsError) {
      console.warn('Could not fetch user settings, using defaults:', settingsError);
    }

    // Use user settings or fallback to defaults
    const defaultSettings = {
      primaryText: 'Check out our latest offer!',
      headline: 'Amazing New Product',
      description: '',
      destinationUrl: 'https://example.com',
      callToAction: 'LEARN_MORE',
      status: 'PAUSED',
      urlParams: '',
      campaignId: null,
      campaignName: '',
      adSetId: null,
      adSetName: '',
      siteLinks: [],
      advantageCreative: {
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
        music: false,
        '3d_animation': false,
        translate_text: false
      }
    };

    const settings = userSettings || defaultSettings;

    console.log(`[SEND-TO-AD-BATCH] Final settings to be applied:`, {
      campaignId: settings.campaignId,
      adSetId: settings.adSetId,
      primaryText: settings.primaryText?.substring(0, 50) + '...',
      headline: settings.headline,
      destinationUrl: settings.destinationUrl,
      settingsSource: userSettings ? 'User Configuration' : 'Default Settings'
    });

    // Convert PowerBrief assets to ad drafts (without batch association)
    const createdDrafts = [];
    const draftIdsForThumbnailGeneration = [];

    for (const group of uploadedAssets) {
      // Create an ad draft for each asset group using user's settings
      const adDraftData = {
        user_id: userId,
        brand_id: brandId,
        ad_batch_id: null, // No batch association
        ad_name: `${basicConcept.concept_title} - ${group.baseName}`,
        primary_text: settings.primaryText,
        headline: settings.headline || basicConcept.concept_title,
        description: settings.description || `Assets: ${group.aspectRatios?.join(', ') || 'Multiple formats'}`,
        destination_url: settings.destinationUrl,
        call_to_action: settings.callToAction,
        campaign_id: settings.campaignId,
        campaign_name: settings.campaignName,
        ad_set_id: settings.adSetId,
        ad_set_name: settings.adSetName,
        meta_status: settings.status, // This is the Ad Status that gets sent to Meta (PAUSED, ACTIVE, etc.)
        app_status: 'DRAFT', // This is the Meta Upload Status (always starts as DRAFT)
        site_links: settings.siteLinks,
        advantage_plus_creative: settings.advantageCreative,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        video_editor: basicConcept.video_editor || null,
        strategist: basicConcept.strategist || null
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
        thumbnail_url: asset.thumbnailUrl || null,
        created_at: new Date().toISOString()
      }));

      const { error: assetsError } = await supabaseAdmin
        .from('ad_draft_assets')
        .insert(assetInserts);

      if (assetsError) {
        console.error('Error creating ad draft assets:', assetsError);
        // Consider whether to delete the draft if assets fail
      } else {
        const hasVideoAssets = group.assets.some(asset => asset.type === 'video');
        
        createdDrafts.push({
          id: createdDraft.id,
          name: adDraftData.ad_name,
          assetCount: group.assets.length,
          hasVideoAssets: hasVideoAssets
        });

        // Track drafts that need thumbnail generation
        if (hasVideoAssets) {
          draftIdsForThumbnailGeneration.push(createdDraft.id);
        }
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
      totalDrafts: createdDrafts.length,
      appliedSettings: userSettings ? 'User settings applied' : 'Default settings applied',
      thumbnailGeneration: {
        needed: draftIdsForThumbnailGeneration.length > 0,
        draftsWithVideos: draftIdsForThumbnailGeneration.length,
        note: 'Thumbnails will be generated automatically when user opens the ad uploader'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in send-to-ad-upload API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 