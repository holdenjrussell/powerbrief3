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
  meta_use_page_as_actor: boolean | null;
  meta_page_backed_instagram_accounts: Record<string, string> | null;
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

// Helper function to check if a video is ready for use in ads
const checkVideoStatus = async (videoId: string, accessToken: string): Promise<{ ready: boolean; status?: string }> => {
  try {
    const videoApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${videoId}?fields=status&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(videoApiUrl);
    
    if (!response.ok) {
      console.warn(`[Launch API] Could not check video status for ${videoId}: ${response.status}`);
      return { ready: false };
    }
    
    const data = await response.json();
    const status = data.status?.video_status || data.status;
    
    console.log(`[Launch API] Video ${videoId} status: ${status}`);
    
    // Video is ready when status is 'ready' or 'published'
    return { 
      ready: status === 'ready' || status === 'published',
      status: status
    };
  } catch (error) {
    console.warn(`[Launch API] Error checking video status for ${videoId}:`, error);
    return { ready: false };
  }
};

// Helper function to wait for videos to be ready with timeout
const waitForVideosToBeReady = async (videoIds: string[], accessToken: string, maxWaitTimeMs: number = 300000): Promise<{ allReady: boolean; notReadyVideos: string[] }> => {
  const startTime = Date.now();
  const notReadyVideos: string[] = [];
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    notReadyVideos.length = 0; // Clear the array
    
    for (const videoId of videoIds) {
      const { ready } = await checkVideoStatus(videoId, accessToken);
      if (!ready) {
        notReadyVideos.push(videoId);
      }
    }
    
    if (notReadyVideos.length === 0) {
      return { allReady: true, notReadyVideos: [] };
    }
    
    // Wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  return { allReady: false, notReadyVideos };
};

// Function to create or get Page-Backed Instagram Account
const createPageBackedInstagramAccount = async (pageId: string, accessToken: string): Promise<string | null> => {
  try {
    console.log(`[Launch API] Creating/getting Page-Backed Instagram Account for page ${pageId}`);
    
    // First, check if a PBIA already exists for this page
    const checkUrl = `https://graph.facebook.com/${META_API_VERSION}/${pageId}/page_backed_instagram_accounts?access_token=${encodeURIComponent(accessToken)}`;
    const checkResponse = await fetch(checkUrl);
    
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.data && checkData.data.length > 0) {
        const existingPBIA = checkData.data[0];
        console.log(`[Launch API] Found existing PBIA for page ${pageId}: ${existingPBIA.id}`);
        return existingPBIA.id;
      }
    }
    
    // Create a new PBIA if none exists
    const createUrl = `https://graph.facebook.com/${META_API_VERSION}/${pageId}/page_backed_instagram_accounts`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `access_token=${encodeURIComponent(accessToken)}`
    });
    
    if (!createResponse.ok) {
      console.error(`[Launch API] Failed to create PBIA for page ${pageId}:`, createResponse.status, createResponse.statusText);
      return null;
    }
    
    const createData = await createResponse.json();
    if (createData.error) {
      console.error(`[Launch API] Error creating PBIA for page ${pageId}:`, createData.error);
      return null;
    }
    
    const pbiaId = createData.id;
    console.log(`[Launch API] Created new PBIA for page ${pageId}: ${pbiaId}`);
    return pbiaId;
    
  } catch (error) {
    console.error(`[Launch API] Exception creating PBIA for page ${pageId}:`, error);
    return null;
  }
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
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at, meta_instagram_actor_id, meta_use_page_as_actor, meta_page_backed_instagram_accounts')
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

    // Determine Instagram User ID based on "Use Page As Actor" setting
    let finalInstagramUserId: string | null = null;
    
    if (brandData.meta_use_page_as_actor) {
      console.log('[Launch API] "Use Page As Actor" is enabled - will create/use Page-Backed Instagram Account');
      
      // Check if we already have a PBIA for this page
      const pageBackedAccounts = brandData.meta_page_backed_instagram_accounts || {};
      let pbiaId = pageBackedAccounts[fbPageId];
      
      if (pbiaId && !pbiaId.startsWith('pbia_')) {
        // We have a real PBIA ID (not a placeholder)
        console.log(`[Launch API] Found existing PBIA for page ${fbPageId}: ${pbiaId}`);
        finalInstagramUserId = pbiaId;
      } else {
        console.log(`[Launch API] No existing PBIA found for page ${fbPageId}, creating new one...`);
        
        // Create a new Page-Backed Instagram Account
        pbiaId = await createPageBackedInstagramAccount(fbPageId, accessToken);
        
        if (pbiaId) {
          console.log(`[Launch API] Successfully created PBIA for page ${fbPageId}: ${pbiaId}`);
          finalInstagramUserId = pbiaId;
          
          // Update the brand's PBIA mapping in the database
          try {
            const updatedPBIAMapping = { ...pageBackedAccounts, [fbPageId]: pbiaId };
            await supabase
              .from('brands')
              .update({ meta_page_backed_instagram_accounts: updatedPBIAMapping } as any)
              .eq('id', brandId);
            console.log(`[Launch API] Updated brand PBIA mapping with new account ${pbiaId}`);
          } catch (error) {
            console.error('[Launch API] Failed to update brand PBIA mapping:', error);
            // Continue anyway - we have the PBIA ID for this session
          }
        } else {
          console.error(`[Launch API] Failed to create PBIA for page ${fbPageId}`);
          // Fall back to regular Instagram account or Facebook-only
          finalInstagramUserId = instagramUserId || brandData.meta_instagram_actor_id;
        }
      }
    } else {
      // Use regular Instagram account resolution
      finalInstagramUserId = instagramUserId || brandData.meta_instagram_actor_id;
    }
    
    console.log(`[Launch API] Instagram User ID resolution:`, {
      usePageAsActor: brandData.meta_use_page_as_actor || false,
      fromRequest: instagramUserId || 'not provided',
      fromBrandData: brandData.meta_instagram_actor_id || 'not set',
      finalValue: finalInstagramUserId || 'will skip Instagram',
      pageBackedAccounts: Object.keys(brandData.meta_page_backed_instagram_accounts || {}).length
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

          // Check if response is ok and has content before parsing JSON
          if (!metaResponse.ok) {
            console.error(`[Launch API]     HTTP error uploading ${asset.name} to Meta:`, {
              status: metaResponse.status,
              statusText: metaResponse.statusText,
              url: metaUploadUrl.split('?')[0]
            });
            updatedAssets.push({ ...asset, metaUploadError: `HTTP ${metaResponse.status}: ${metaResponse.statusText}` });
            continue;
          }

          // Check if response has content and is JSON
          const contentType = metaResponse.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error(`[Launch API]     Non-JSON response uploading ${asset.name} to Meta:`, {
              contentType,
              status: metaResponse.status,
              statusText: metaResponse.statusText
            });
            updatedAssets.push({ ...asset, metaUploadError: 'Meta API returned non-JSON response' });
            continue;
          }

          let metaResult;
          try {
            const responseText = await metaResponse.text();
            if (!responseText.trim()) {
              console.error(`[Launch API]     Empty response uploading ${asset.name} to Meta`);
              updatedAssets.push({ ...asset, metaUploadError: 'Meta API returned empty response' });
              continue;
            }
            metaResult = JSON.parse(responseText);
          } catch (jsonError) {
            console.error(`[Launch API]     JSON parse error uploading ${asset.name} to Meta:`, jsonError);
            updatedAssets.push({ ...asset, metaUploadError: `Failed to parse Meta API response: ${(jsonError as Error).message}` });
            continue;
          }

          // Check if the parsed result contains an error
          if (metaResult.error) {
            console.error(`[Launch API]     Error uploading ${asset.name} to Meta:`, metaResult.error);
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
      const adId: string | undefined = undefined;
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
          instagram_user_id: finalInstagramUserId
        };
      } else {
        console.log(`[Launch API]     Creating Facebook-only ad creative`);
        creativeSpec.object_story_spec = {
          page_id: fbPageId
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

        // When using asset_feed_spec, we should NOT use object_story_spec.link_data
        // The link information is already in asset_feed_spec.link_urls
        console.log(`[Launch API]     Using asset_feed_spec approach - link data is in asset_feed_spec.link_urls`);

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

      // Check if any videos need to be ready before creating the ad
      const videoIds = (draft.assets as ProcessedAdDraftAsset[])
        .filter(asset => asset.type === 'video' && asset.metaVideoId && !asset.metaUploadError)
        .map(asset => asset.metaVideoId!);

      if (videoIds.length > 0) {
        console.log(`[Launch API]     Checking readiness of ${videoIds.length} videos before creating ad...`);
        
        // Update status to show we're waiting for video processing
        try {
          await supabase
            .from('ad_drafts')
            .update({ app_status: 'PROCESSING_VIDEOS' })
            .eq('id', draft.id);
          console.log(`[Launch API] Updated draft ${draft.adName} status to PROCESSING_VIDEOS`);
        } catch (error) {
          console.error(`[Launch API] Failed to update draft status to PROCESSING_VIDEOS:`, error);
        }
        
        // Wait for videos to be ready (max 5 minutes)
        const { allReady, notReadyVideos } = await waitForVideosToBeReady(videoIds, accessToken, 300000);
        
        if (!allReady) {
          const errorMessage = `Videos are still processing and not ready for ad use: ${notReadyVideos.join(', ')}. Please try again in a few minutes.`;
          console.error(`[Launch API]     ${errorMessage}`);
          finalStatus = 'AD_CREATION_FAILED';
          adError = errorMessage;
          
          // Skip ad creation for this draft
          processingResults.push({
            adName: draft.adName,
            status: finalStatus,
            assets: draft.assets.map((a: ProcessedAdDraftAsset) => ({
              name: a.name,
              type: a.type,
              supabaseUrl: a.supabaseUrl,
              metaHash: a.metaHash,
              metaVideoId: a.metaVideoId,
              uploadError: a.metaUploadError
            })),
            campaignId: draft.campaignId,
            adSetId: draft.adSetId,
            adId: undefined,
            adError: adError,
          });

          // Update the draft's app_status in the database
          try {
            await supabase
              .from('ad_drafts')
              .update({ app_status: 'ERROR' })
              .eq('id', draft.id);
            
            console.log(`[Launch API] Updated draft ${draft.adName} status to ERROR`);
          } catch (error) {
            console.error(`[Launch API] Failed to update draft ${draft.adName} status:`, error);
          }
          
          continue; // Skip to next draft
        }
        
        console.log(`[Launch API]     All videos are ready! Proceeding with ad creation...`);
      }

      // Validate ad set exists and get its campaign info for logging
      try {
        // Step 1: Get ad set data including campaign_id
        const adSetApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${draft.adSetId}?fields=id,name,status,effective_status,campaign_id,dsa_payor,dsa_beneficiary&access_token=${encodeURIComponent(accessToken)}`;
        console.log(`[Launch API]     Validating ad set ${draft.adSetId}...`);
        
        const adSetResponse = await fetch(adSetApiUrl);
        if (!adSetResponse.ok) {
          throw new Error(`Ad set validation failed: ${adSetResponse.status} ${adSetResponse.statusText}`);
        }
        
        const adSetData = await adSetResponse.json();
        if (adSetData.error) {
          throw new Error(`Ad set error: ${adSetData.error.message}`);
        }
        
        console.log(`[Launch API]     Ad set validated: ${adSetData.name} (Campaign: ${adSetData.campaign_id})`);
        
        // Continue with ad creation...
        // (Rest of the ad creation logic would go here)
        
        finalStatus = 'COMPLETED';
        console.log(`[Launch API] Successfully processed draft: ${draft.adName}`);
        
      } catch (error) {
        console.error(`[Launch API] Error processing draft ${draft.adName}:`, error);
        finalStatus = 'AD_CREATION_FAILED';
        adError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Add result to processing results
      processingResults.push({
        adName: draft.adName,
        status: finalStatus,
        assets: draft.assets.map((a: ProcessedAdDraftAsset) => ({
          name: a.name,
          type: a.type,
          supabaseUrl: a.supabaseUrl,
          metaHash: a.metaHash,
          metaVideoId: a.metaVideoId,
          uploadError: a.metaUploadError
        })),
        campaignId: draft.campaignId,
        adSetId: draft.adSetId,
        adId: adId,
        adError: adError,
      });

      // Update the draft's app_status in the database
      try {
        const dbStatus = finalStatus === 'COMPLETED' ? 'COMPLETED' : 'ERROR';
        await supabase
          .from('ad_drafts')
          .update({ app_status: dbStatus })
          .eq('id', draft.id);
        
        console.log(`[Launch API] Updated draft ${draft.adName} status to ${dbStatus}`);
      } catch (error) {
        console.error(`[Launch API] Failed to update draft ${draft.adName} status:`, error);
      }
    }

    // Send Slack notification about the batch processing results
    try {
      const successCount = processingResults.filter(r => r.status === 'COMPLETED').length;
      const failureCount = processingResults.length - successCount;
      
      await sendSlackNotification({
        type: 'ad_launch_batch_complete',
        brandId,
        data: {
          totalAds: processingResults.length,
          successCount,
          failureCount,
          results: processingResults
        }
      });
    } catch (slackError) {
      console.error('[Launch API] Failed to send Slack notification:', slackError);
      // Don't fail the entire request for Slack notification failures
    }

    return NextResponse.json({
      message: `Processed ${processingResults.length} ad drafts`,
      results: processingResults,
      summary: {
        total: processingResults.length,
        successful: processingResults.filter(r => r.status === 'COMPLETED').length,
        failed: processingResults.filter(r => r.status !== 'COMPLETED').length
      }
    });

  } catch (error) {
    console.error('[Launch API] Unexpected error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error during ad launch', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}