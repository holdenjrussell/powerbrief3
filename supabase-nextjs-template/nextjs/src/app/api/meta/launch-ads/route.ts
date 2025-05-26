import { NextRequest, NextResponse } from 'next/server';
import { AdDraft, AdDraftAsset } from '@/components/ad-upload-tool/adUploadTypes';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { sendSlackNotification } from '@/lib/utils/slackNotifications';

interface LaunchAdsRequestBody {
  drafts: AdDraft[];
  brandId: string;
  adAccountId: string;
  fbPageId: string;
  instagramUserId?: string;
}

// More specific type for the data we expect from the 'brands' table for token decryption
interface BrandTokenInfo {
  meta_access_token: string | null;
  meta_access_token_iv: string | null;
  meta_access_token_auth_tag: string | null;
  meta_access_token_expires_at: string | null;
  meta_instagram_actor_id: string | null;
}

// Type for assets after Meta processing attempt
interface ProcessedAdDraftAsset extends AdDraftAsset {
  metaHash?: string;
  metaVideoId?: string;
  metaUploadError?: string;
}

// Add new interface for Ad response
interface AdResponse {
  id?: string;
  error?: { // More specific error typing
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';

// Helper function to extract aspect ratio from filename as fallback
const detectAspectRatioFromFilename = (filename: string): string | null => {
  const identifiers = ['1x1', '9x16', '16x9', '4x5', '2x3', '3x2', '1:1', '9:16', '16:9', '4:5', '2:3', '3:2'];
  
  for (const id of identifiers) {
    const patternsToTest = [
      `_${id}`,
      `-${id}`,
      ` - ${id}`,
      `:${id}`,
      `(${id})`,
      `(${id}`
    ];
    
    for (const pattern of patternsToTest) {
      if (filename.includes(pattern)) {
        return id;
      }
    }
  }
  
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LaunchAdsRequestBody;
    const { drafts, brandId, adAccountId, fbPageId, instagramUserId } = body;

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ message: 'No ad drafts provided for launch.' }, { status: 400 });
    }
    if (!brandId) {
      return NextResponse.json({ message: 'Brand ID is missing.' }, { status: 400 });
    }
    if (!adAccountId) {
      return NextResponse.json({ message: 'Meta Ad Account ID is missing.' }, { status: 400 });
    }
    if (!fbPageId) {
      return NextResponse.json({ message: 'Facebook Page ID is missing.' }, { status: 400 });
    }

    console.log(`[Launch API] Received request to launch ${drafts.length} ads for brand ${brandId}, ad account ${adAccountId}, page ${fbPageId}`);
    if (instagramUserId) {
      console.log(`[Launch API] Instagram User ID: ${instagramUserId}`);
    } else {
      console.log(`[Launch API] No Instagram User ID provided - will create Facebook-only ads`);
    }
    
    // Debug: Log the exact values we received
    console.log(`[Launch API] Request body debug:`, {
      brandId,
      adAccountId,
      fbPageId,
      instagramUserId: instagramUserId || 'undefined/null/empty',
      instagramUserIdType: typeof instagramUserId,
      instagramUserIdLength: instagramUserId ? instagramUserId.length : 0
    });

    const supabase = await createSSRClient(); // Supabase client
    
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at, meta_instagram_actor_id')
      .eq('id', brandId)
      .single<BrandTokenInfo>(); // Use the more specific type here

    if (brandError) {
      console.error('[Launch API] Error fetching brand:', brandError);
      return NextResponse.json({ message: 'Failed to fetch brand details.', error: brandError.message }, { status: 500 });
    }
    if (!brandData) {
      return NextResponse.json({ message: 'Brand not found.' }, { status: 404 });
    }
    // Check for nulls explicitly on the required fields for decryption
    if (!brandData.meta_access_token || !brandData.meta_access_token_iv || !brandData.meta_access_token_auth_tag) {
      return NextResponse.json({ message: 'Brand not fully connected to Meta or essential token data is missing.' }, { status: 400 });
    }

    if (brandData.meta_access_token_expires_at) {
      const expirationDate = new Date(brandData.meta_access_token_expires_at);
      if (expirationDate <= new Date()) {
        return NextResponse.json({ message: 'Meta access token has expired. Please reconnect.' }, { status: 401 });
      }
    }

    let accessToken;
    try {
      // Type assertion is safe here due to the check above
      accessToken = decryptToken({
        encryptedToken: brandData.meta_access_token!,
        iv: brandData.meta_access_token_iv!,
        authTag: brandData.meta_access_token_auth_tag!,
      });
    } catch (decryptionError) {
      console.error('[Launch API] Token decryption failed:', decryptionError);
      return NextResponse.json({ message: 'Failed to decrypt Meta access token.', error: (decryptionError as Error).message }, { status: 500 });
    }

    if (!accessToken) {
        return NextResponse.json({ message: 'Decrypted access token is invalid.' }, { status: 500 });
    }

    console.log('[Launch API] Meta Access Token decrypted successfully.');

    // Use Instagram User ID from request or fallback to brand data
    const finalInstagramUserId = instagramUserId || brandData.meta_instagram_actor_id;
    console.log(`[Launch API] Instagram User ID resolution:`, {
      fromRequest: instagramUserId || 'not provided',
      fromBrandData: brandData.meta_instagram_actor_id || 'not set',
      finalValue: finalInstagramUserId || 'will skip Instagram',
    });

    // First, update all drafts to UPLOADING status
    const draftIds = drafts.map(draft => draft.id);
    try {
      await supabase
        .from('ad_drafts')
        .update({ app_status: 'UPLOADING' })
        .in('id', draftIds);
      console.log('[Launch API] Updated drafts to UPLOADING status');
    } catch (error) {
      console.error('[Launch API] Failed to update drafts to UPLOADING status:', error);
    }

    const processingResults = [];
    // Use a new array to store drafts with updated asset info (meta IDs)
    const draftsWithMetaAssets: AdDraft[] = [];

    // Populate draftsWithMetaAssets with uploaded asset details (existing logic)
    for (const draft of drafts) {
      console.log(`[Launch API] Processing draft for asset uploads: ${draft.adName}`);
      const updatedAssets: ProcessedAdDraftAsset[] = [];

      for (const asset of draft.assets) {
        console.log(`[Launch API]   - Asset to upload: ${asset.name} (Type: ${asset.type}, URL: ${asset.supabaseUrl})`);
        try {
          const assetResponse = await fetch(asset.supabaseUrl);
          if (!assetResponse.ok) {
            throw new Error(`Failed to fetch asset ${asset.name} from Supabase: ${assetResponse.statusText}`);
          }
          const assetBlob = await assetResponse.blob();

          const formData = new FormData();
          formData.append('access_token', accessToken);
          formData.append('source', assetBlob, asset.name);

          // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
          const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
          
          let metaUploadUrl = '';
          if (asset.type === 'image') {
            metaUploadUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/adimages`;
          } else if (asset.type === 'video') {
            metaUploadUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/advideos`;
          } else {
            console.warn(`[Launch API]     Unsupported asset type: ${asset.type} for asset ${asset.name}`);
            updatedAssets.push({ ...asset, metaUploadError: 'Unsupported type' });
            continue;
          }

          console.log(`[Launch API]     Uploading ${asset.name} to ${metaUploadUrl.split('?')[0]}...`);
          const metaResponse = await fetch(metaUploadUrl, {
            method: 'POST',
            body: formData,
          });

          const metaResult = await metaResponse.json();

          if (!metaResponse.ok || metaResult.error) {
            console.error(`[Launch API]     Error uploading ${asset.name} to Meta:`, metaResult.error || metaResult);
            updatedAssets.push({ ...asset, metaUploadError: metaResult.error?.message || `Failed to upload ${asset.name}` });
            continue;
          }

          if (asset.type === 'image') {
            const imageHash = metaResult.images?.[asset.name]?.hash;
            if (!imageHash) {
                 console.error('[Launch API]     Could not find image hash in Meta response for:', asset.name, metaResult);
                 updatedAssets.push({ ...asset, metaUploadError: 'Image hash not found in Meta response' });
                 continue;
            }
            console.log(`[Launch API]     Image ${asset.name} uploaded. Hash: ${imageHash}`);
            updatedAssets.push({ ...asset, metaHash: imageHash });
          } else if (asset.type === 'video') {
            const videoId = metaResult.id;
            if (!videoId) {
                console.error('[Launch API]     Could not find video ID in Meta response for:', asset.name, metaResult);
                updatedAssets.push({ ...asset, metaUploadError: 'Video ID not found in Meta response' });
                continue;
            }
            console.log(`[Launch API]     Video ${asset.name} uploaded. ID: ${videoId}`);
            updatedAssets.push({ ...asset, metaVideoId: videoId });
          }
        } catch (uploadError) {
          console.error(`[Launch API]     Failed to upload asset ${asset.name}:`, uploadError);
          updatedAssets.push({ ...asset, metaUploadError: (uploadError as Error).message });
        }
      }
      // Add the draft with its processed assets to draftsWithMetaAssets
      // This ensures draftsWithMetaAssets contains all drafts, even if some asset uploads failed
      draftsWithMetaAssets.push({ ...draft, assets: updatedAssets });

      // Initial result status based on asset uploads for this draft (will be updated after ad/creative creation)
      // This part of currentDraftResult will be moved or adapted later
    }


    // Now, iterate through draftsWithMetaAssets to create Ad Creatives and Ads
    for (const draft of draftsWithMetaAssets) {
      let adId: string | undefined = undefined;
      let finalStatus = 'ASSETS_PROCESSED'; // Default status after asset processing
      let adError: string | undefined = undefined;

      console.log(`[Launch API] Processing for Ad/Creative creation: ${draft.adName}`);

      // Debug: Log all assets and their properties
      console.log(`[Launch API]     Assets for ${draft.adName}:`);
      (draft.assets as ProcessedAdDraftAsset[]).forEach((asset, index) => {
        console.log(`[Launch API]       Asset ${index}: ${asset.name}`);
        console.log(`[Launch API]         - Type: ${asset.type}`);
        console.log(`[Launch API]         - AspectRatios: ${(asset as ProcessedAdDraftAsset).aspectRatios || 'N/A'}`);
        console.log(`[Launch API]         - MetaHash: ${(asset as ProcessedAdDraftAsset).metaHash || 'N/A'}`);
        console.log(`[Launch API]         - MetaVideoId: ${(asset as ProcessedAdDraftAsset).metaVideoId || 'N/A'}`);
        console.log(`[Launch API]         - Upload Error: ${(asset as ProcessedAdDraftAsset).metaUploadError || 'None'}`);
      });

      // Group assets by aspect ratio for placement targeting
      const feedAssets = (draft.assets as ProcessedAdDraftAsset[]).filter((asset: ProcessedAdDraftAsset) => {
        if (!(asset.metaHash || asset.metaVideoId) || asset.metaUploadError) return false;
        
        // Use existing aspect ratios or detect from filename as fallback
        const aspectRatios = asset.aspectRatios || [];
        const detectedRatio = aspectRatios.length === 0 ? detectAspectRatioFromFilename(asset.name) : null;
        const ratiosToCheck = aspectRatios.length > 0 ? aspectRatios : (detectedRatio ? [detectedRatio] : []);
        
        console.log(`[Launch API]         - ${asset.name}: Using ratios ${JSON.stringify(ratiosToCheck)} (detected: ${detectedRatio})`);
        
        return ratiosToCheck.length === 0 || ratiosToCheck.some(ratio => ['1:1', '4:5', '16:9', '1x1', '4x5', '16x9'].includes(ratio));
      });
      
      const storyAssets = (draft.assets as ProcessedAdDraftAsset[]).filter((asset: ProcessedAdDraftAsset) => {
        if (!(asset.metaHash || asset.metaVideoId) || asset.metaUploadError) return false;
        
        // Use existing aspect ratios or detect from filename as fallback
        const aspectRatios = asset.aspectRatios || [];
        const detectedRatio = aspectRatios.length === 0 ? detectAspectRatioFromFilename(asset.name) : null;
        const ratiosToCheck = aspectRatios.length > 0 ? aspectRatios : (detectedRatio ? [detectedRatio] : []);
        
        return ratiosToCheck.some(ratio => ['9:16', '9x16'].includes(ratio));
      });

      console.log(`[Launch API]     Found ${feedAssets.length} feed assets and ${storyAssets.length} story assets`);
      
      // Debug: Log which assets went into which category
      console.log(`[Launch API]     Feed assets:`, feedAssets.map(a => ({ name: a.name, aspectRatios: a.aspectRatios })));
      console.log(`[Launch API]     Story assets:`, storyAssets.map(a => ({ name: a.name, aspectRatios: a.aspectRatios })));

      // 2. Prepare Ad Creative Data using Asset Feed Spec for placement customization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creativeSpec: any = {
        name: `Creative for ${draft.adName}`,
        asset_feed_spec: {
          ad_formats: [],
          bodies: [{ text: draft.primaryText }],
          titles: [{ text: draft.headline || draft.adName }],
          descriptions: draft.description ? [{ text: draft.description }] : [],
          link_urls: [{
            website_url: draft.destinationUrl,
            display_url: draft.destinationUrl
          }],
          call_to_action_types: [draft.callToAction?.toUpperCase().replace(/\s+/g, '_') || 'LEARN_MORE'],
          images: [],
          videos: [],
          asset_customization_rules: []
        }
      };

      // Add Site Links if available
      if (draft.siteLinks && draft.siteLinks.length > 0) {
        const validSiteLinks = draft.siteLinks.filter(link => 
          link.site_link_title && link.site_link_url && 
          link.site_link_title.trim() !== '' && link.site_link_url.trim() !== ''
        );
        
        if (validSiteLinks.length > 0) {
          console.log(`[Launch API]     Adding ${validSiteLinks.length} site links to creative`);
          
          // Add site links to creative_sourcing_spec
          if (!creativeSpec.creative_sourcing_spec) {
            creativeSpec.creative_sourcing_spec = {};
          }
          
          creativeSpec.creative_sourcing_spec.site_links_spec = validSiteLinks.map(link => ({
            site_link_title: link.site_link_title,
            site_link_url: link.site_link_url,
            ...(link.site_link_image_url && { site_link_image_url: link.site_link_image_url }),
            ...(link.is_site_link_sticky !== undefined && { is_site_link_sticky: link.is_site_link_sticky })
          }));
          
          // Enable site extensions in degrees_of_freedom_spec
          if (!creativeSpec.degrees_of_freedom_spec) {
            creativeSpec.degrees_of_freedom_spec = {};
          }
          if (!creativeSpec.degrees_of_freedom_spec.creative_features_spec) {
            creativeSpec.degrees_of_freedom_spec.creative_features_spec = {};
          }
          
          creativeSpec.degrees_of_freedom_spec.creative_features_spec.site_extensions = {
            enroll_status: "OPT_IN"
          };
        }
      }

      // Add Advantage+ Creative Enhancements if any are enabled
      if (draft.advantageCreative) {
        const enabledEnhancements = Object.entries(draft.advantageCreative).filter(([, enabled]) => enabled);
        
        if (enabledEnhancements.length > 0) {
          console.log(`[Launch API]     Adding ${enabledEnhancements.length} Advantage+ creative enhancements`);
          
          // Initialize degrees_of_freedom_spec if not exists
          if (!creativeSpec.degrees_of_freedom_spec) {
            creativeSpec.degrees_of_freedom_spec = {};
          }
          if (!creativeSpec.degrees_of_freedom_spec.creative_features_spec) {
            creativeSpec.degrees_of_freedom_spec.creative_features_spec = {};
          }
          
          // Map our enhancement keys to Meta's API format
          const enhancementMapping: Record<string, string> = {
            inline_comment: 'inline_comment',
            image_templates: 'image_templates', 
            image_touchups: 'image_touchups',
            video_auto_crop: 'video_auto_crop',
            image_brightness_and_contrast: 'image_brightness_and_contrast',
            enhance_cta: 'enhance_cta',
            text_optimizations: 'text_optimizations',
            image_uncrop: 'image_uncrop',
            adapt_to_placement: 'adapt_to_placement',
            media_type_automation: 'media_type_automation',
            product_extensions: 'product_extensions',
            description_automation: 'description_automation',
            add_text_overlay: 'add_text_overlay',
            site_extensions: 'site_extensions',
            '3d_animation': '3d_animation',
            translate_text: 'translate_text'
          };
          
          // Add enabled enhancements
          enabledEnhancements.forEach(([key]) => {
            const metaKey = enhancementMapping[key];
            if (metaKey) {
              creativeSpec.degrees_of_freedom_spec.creative_features_spec[metaKey] = {
                enroll_status: "OPT_IN"
              };
            }
          });
        }
      }

      // Only add Instagram User ID if it's a valid non-empty string
      if (finalInstagramUserId && finalInstagramUserId.trim() !== '') {
        console.log(`[Launch API]     Adding Instagram User ID to creative: ${finalInstagramUserId}`);
        creativeSpec.object_story_spec = {
          page_id: fbPageId,
          instagram_user_id: finalInstagramUserId,
          link: draft.destinationUrl
        };
      } else {
        console.log(`[Launch API]     Creating Facebook-only ad creative`);
        creativeSpec.object_story_spec = {
          page_id: fbPageId,
          link: draft.destinationUrl
        };
      }

      // If we have assets for different placements, use placement asset customization
      if (feedAssets.length > 0 && storyAssets.length > 0) {
        console.log(`[Launch API]     Using placement asset customization for multiple aspect ratios`);
        
        // Add feed assets
        feedAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
          const assetLabel = `feed_asset_${index}`;
          if (asset.type === 'image' && asset.metaHash) {
            creativeSpec.asset_feed_spec.images.push({
              hash: asset.metaHash,
              adlabels: [{ name: assetLabel }]
            });
            creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_IMAGE');
          } else if (asset.type === 'video' && asset.metaVideoId) {
            creativeSpec.asset_feed_spec.videos.push({
              video_id: asset.metaVideoId,
              adlabels: [{ name: assetLabel }]
            });
            creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
          }

          // Add customization rule for feed placements
          creativeSpec.asset_feed_spec.asset_customization_rules.push({
            customization_spec: {
              publisher_platforms: ['facebook', 'instagram'],
              facebook_positions: ['feed', 'video_feeds'],
              instagram_positions: ['stream', 'explore']
            },
            [asset.type === 'image' ? 'image_label' : 'video_label']: { name: assetLabel }
          });
        });

        // Add story assets
        storyAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
          const assetLabel = `story_asset_${index}`;
          if (asset.type === 'image' && asset.metaHash) {
            creativeSpec.asset_feed_spec.images.push({
              hash: asset.metaHash,
              adlabels: [{ name: assetLabel }]
            });
            if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_IMAGE')) {
              creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_IMAGE');
            }
          } else if (asset.type === 'video' && asset.metaVideoId) {
            creativeSpec.asset_feed_spec.videos.push({
              video_id: asset.metaVideoId,
              adlabels: [{ name: assetLabel }]
            });
            if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_VIDEO')) {
              creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
            }
          }

          // Add customization rule for story placements
          creativeSpec.asset_feed_spec.asset_customization_rules.push({
            customization_spec: {
              publisher_platforms: ['facebook', 'instagram'],
              facebook_positions: ['story'],
              instagram_positions: ['story']
            },
            [asset.type === 'image' ? 'image_label' : 'video_label']: { name: assetLabel }
          });
        });

      } else if (feedAssets.length > 0 || storyAssets.length > 0) {
        // Use the first available asset (fallback to simple approach)
        const availableAssets = feedAssets.length > 0 ? feedAssets : storyAssets;
        const selectedAsset = availableAssets[0];
        
        console.log(`[Launch API]     Using single asset approach with: ${selectedAsset.name}`);
        
        // Use the traditional object_story_spec approach for single asset
        if (selectedAsset.type === 'image' && selectedAsset.metaHash) {
          creativeSpec.object_story_spec.link_data = {
            message: draft.primaryText,
            link: draft.destinationUrl,
            call_to_action: {
              type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
              value: { link: draft.destinationUrl },
            },
            name: draft.headline,
            ...(draft.description && { description: draft.description }),
            image_hash: selectedAsset.metaHash
          };
        } else if (selectedAsset.type === 'video' && selectedAsset.metaVideoId) {
          creativeSpec.object_story_spec.link_data = {
            message: draft.primaryText,
            link: draft.destinationUrl,
            call_to_action: {
              type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
              value: { link: draft.destinationUrl },
            },
            name: draft.headline,
            ...(draft.description && { description: draft.description }),
            video_id: selectedAsset.metaVideoId
          };
        }
        
        // Remove asset_feed_spec for single asset approach
        delete creativeSpec.asset_feed_spec;
      } else {
        throw new Error('No valid assets found for creative creation');
      }

      // Validate ad set exists and get its campaign info for logging
      try {
        // Step 1: Get ad set data including campaign_id
        const adSetApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${draft.adSetId}?fields=id,name,status,effective_status,campaign_id,dsa_payor,dsa_beneficiary&access_token=${encodeURIComponent(accessToken)}`;
        console.log(`[Launch API]     Fetching ad set data from: ${adSetApiUrl.split('?')[0]}`);
        
        const adSetResponse = await fetch(adSetApiUrl);
        const adSetData = await adSetResponse.json();
        
        if (!adSetResponse.ok || adSetData.error) {
          console.error(`[Launch API]     ERROR: Could not fetch ad set data:`, adSetData.error || adSetData);
          
          // If we can't access the ad set, this explains the "object doesn't exist" error
          if (adSetData.error?.code === 100 && adSetData.error?.error_subcode === 33) {
            throw new Error(`Ad Set ${draft.adSetId} does not exist or you don't have permission to access it. Please check the ad set ID and your access token permissions.`);
          } else {
            throw new Error(`Failed to validate ad set ${draft.adSetId}: ${adSetData.error?.message || 'Unknown error'}`);
          }
        }

        console.log(`[Launch API]     Ad Set data:`, adSetData);
        
        // Check if ad set is in a valid state for creating ads
        if (adSetData.status === 'DELETED' || adSetData.status === 'ARCHIVED') {
          throw new Error(`Ad Set ${draft.adSetId} is ${adSetData.status} and cannot be used for creating ads`);
        }

        // Step 2: Get campaign data for logging
        if (adSetData.campaign_id) {
          const campaignApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${adSetData.campaign_id}?fields=id,name,special_ad_categories&access_token=${encodeURIComponent(accessToken)}`;
          console.log(`[Launch API]     Fetching campaign data from: ${campaignApiUrl.split('?')[0]}`);
          
          const campaignResponse = await fetch(campaignApiUrl);
          const campaignData = await campaignResponse.json();
          
          if (campaignResponse.ok && !campaignData.error) {
            console.log(`[Launch API]     Campaign data:`, campaignData);
          } else {
            console.warn(`[Launch API]     Could not fetch campaign data:`, campaignData?.error || campaignData);
          }
        }
        
        console.log(`[Launch API]     Creating ad with inline creative to inherit DSA compliance from Ad Set: ${draft.adSetId}`);
        
      } catch (fetchError) {
        console.error(`[Launch API]     Error validating ad set:`, fetchError);
        throw fetchError; // Re-throw to stop ad creation
      }

      // 3. Create Ad with Inline Creative (NEW WORKFLOW)
      try {
        const adPayload = {
          name: draft.adName,
          adset_id: draft.adSetId,
          creative: creativeSpec, // Pass creative spec directly, not creative_id
          status: draft.status || 'PAUSED', // Default to PAUSED if not specified
        };

        // Create ads under the ad account
        const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
        const adApiUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/ads?access_token=${encodeURIComponent(accessToken)}`;
        console.log(`[Launch API]     Creating Ad with inline creative for ${draft.adName} under Ad Set ${draft.adSetId}... URL: ${adApiUrl.split('?')[0]}`);

        const adResponse = await fetch(adApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adPayload),
        });
        const adResult = await adResponse.json() as AdResponse;

        if (!adResponse.ok || adResult.error) {
          console.error(`[Launch API]     Error creating Ad with inline creative for ${draft.adName}:`, adResult.error || adResult);
          // Log additional debug information
          console.error(`[Launch API]     Ad creation debug info:`, {
            adSetId: draft.adSetId,
            adAccountId: adAccountId,
            formattedAdAccountId: formattedAdAccountId,
            url: adApiUrl.split('?')[0],
            status: adResponse.status,
            statusText: adResponse.statusText
          });
          throw new Error(adResult.error?.message || `Failed to create Ad for ${draft.adName}. Response: ${JSON.stringify(adResult)}`);
        }
        
        adId = adResult.id;
        if (!adId) {
          console.error(`[Launch API]     Ad ID not found in response for ${draft.adName}:`, adResult);
          throw new Error('Ad ID not found in Meta response.');
        }
        console.log(`[Launch API]     Ad created successfully for ${draft.adName}. ID: ${adId}`);
        finalStatus = 'AD_CREATED';
        
        // The creative was created inline, so we don't have a separate creative ID
        // but we can note that the creative was created successfully as part of the ad
        console.log(`[Launch API]     Ad Creative created inline as part of ad creation`);

      } catch (err) {
        console.error(`[Launch API]     Ad creation with inline creative failed for ${draft.adName}:`, err);
        finalStatus = 'AD_CREATION_FAILED';
        adError = (err as Error).message;
      }

      // Update processingResults with the outcome of this draft
      processingResults.push({
        adName: draft.adName,
        status: finalStatus,
        assets: draft.assets.map((a: ProcessedAdDraftAsset) => ({ // Ensure assets are of ProcessedAdDraftAsset type
            name: a.name,
            type: a.type,
            supabaseUrl: a.supabaseUrl,
            metaHash: a.metaHash,
            metaVideoId: a.metaVideoId,
            uploadError: a.metaUploadError // Changed from 'error' to 'uploadError' for clarity
        })),
        campaignId: draft.campaignId,
        adSetId: draft.adSetId,
        adId: adId,
        adError: adError,
      });

      // Update the draft's app_status in the database based on the final result
      try {
        let dbStatus = 'ERROR'; // Default to ERROR
        if (finalStatus === 'AD_CREATED') {
          dbStatus = 'PUBLISHED';
        }
        
        await supabase
          .from('ad_drafts')
          .update({ app_status: dbStatus })
          .eq('id', draft.id);
        
        console.log(`[Launch API] Updated draft ${draft.adName} status to ${dbStatus}`);
      } catch (error) {
        console.error(`[Launch API] Failed to update draft ${draft.adName} status:`, error);
      }
    }

    // The original asset upload loop result construction is now integrated into the main loop.
    // So, the old `processingResults.push(currentDraftResult);` is removed from the asset upload loop.

    // Send Slack notification if any ads were successfully created
    const successfulAds = processingResults.filter(result => result.status === 'AD_CREATED');
    const failedAds = processingResults.filter(result => result.status !== 'AD_CREATED');
    
    if (successfulAds.length > 0) {
      console.log(`[Launch API] Sending Slack notification for ${successfulAds.length} successful ads`);
      
      // Get campaign and ad set info from the first successful ad for the notification
      const firstSuccessfulAd = successfulAds[0];
      
      try {
        await sendSlackNotification({
          brandId,
          campaignId: firstSuccessfulAd.campaignId,
          adSetId: firstSuccessfulAd.adSetId,
          launchedAds: processingResults.map(result => ({
            adName: result.adName,
            status: result.status,
            campaignId: result.campaignId,
            adSetId: result.adSetId,
            adId: result.adId,
            adError: result.adError
          })),
          totalAds: processingResults.length,
          successfulAds: successfulAds.length,
          failedAds: failedAds.length
        });
      } catch (slackError) {
        console.error('[Launch API] Failed to send Slack notification:', slackError);
        // Don't fail the entire request if Slack notification fails
      }
    }

    return NextResponse.json({
      message: `Ad launch processing complete for ${drafts.length} ad draft(s).`,
      results: processingResults
    }, { status: 200 });

  } catch (error) {
    console.error('[Launch API] Top-level error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred processing the launch request.';
    return NextResponse.json({ message: 'Failed to process ad launch request.', error: errorMessage }, { status: 500 });
  }
}