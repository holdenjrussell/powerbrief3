import { NextRequest, NextResponse } from 'next/server';
import { AdDraft, AdDraftAsset } from '@/components/ad-upload-tool/adUploadTypes';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { Database } from '@/lib/types'; 
import { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient for explicit typing

interface LaunchAdsRequestBody {
  drafts: AdDraft[];
  brandId: string;
  adAccountId: string;
  fbPageId: string;
  instagramActorId?: string;
}

// More specific type for the data we expect from the 'brands' table for token decryption
interface BrandTokenInfo {
  meta_access_token: string | null;
  meta_access_token_iv: string | null;
  meta_access_token_auth_tag: string | null;
  meta_access_token_expires_at: string | null;
}

// Type for assets after Meta processing attempt
interface ProcessedAdDraftAsset extends AdDraftAsset {
  metaHash?: string;
  metaVideoId?: string;
  metaUploadError?: string;
}

// Add new interface for Ad Creative response
interface AdCreativeResponse {
  id?: string;
  error?: { // More specific error typing
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
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

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LaunchAdsRequestBody;
    const { drafts, brandId, adAccountId, fbPageId, instagramActorId } = body;

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
    if (instagramActorId) {
      console.log(`[Launch API] Instagram Actor ID: ${instagramActorId}`);
    }

    const supabase: SupabaseClient<Database> = await createSSRClient(); // Explicitly type supabase client and await
    
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at')
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
      let adCreativeId: string | undefined = undefined;
      let adId: string | undefined = undefined;
      let finalStatus = 'ASSETS_PROCESSED'; // Default status after asset processing
      let creativeError: string | undefined = undefined;
      let adError: string | undefined = undefined;

      console.log(`[Launch API] Processing for Ad/Creative creation: ${draft.adName}`);

      // 1. Select Asset for Creative
      const selectedAsset = draft.assets.find(
        (asset: ProcessedAdDraftAsset) => (asset.metaHash || asset.metaVideoId) && !asset.metaUploadError
      ) as ProcessedAdDraftAsset | undefined;

      if (!selectedAsset) {
        console.error(`[Launch API] No successfully uploaded asset found for draft: ${draft.adName}`);
        finalStatus = 'NO_VALID_ASSET_FOR_CREATIVE';
        creativeError = 'No successfully uploaded asset found for creative creation.';
      } else {
        console.log(`[Launch API]   Selected asset for creative: ${selectedAsset.name} (Type: ${selectedAsset.type})`);
        // 2. Create Ad Creative
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const creativePayload: any = {
            name: `Creative for ${draft.adName}`,
            access_token: accessToken,
            object_story_spec: {
              page_id: fbPageId,
              link: draft.destinationUrl, // Ensure this is a valid URL
              link_data: {
                message: draft.primaryText,
                link: draft.destinationUrl, // Repetition, but often required
                call_to_action: {
                  type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'), // Ensure CTA is valid enum
                  value: { link: draft.destinationUrl },
                },
                name: draft.headline, // Headline for link ads
                ...(draft.description && { description: draft.description }), // Optional description
              },
            },
          };

          if (selectedAsset.type === 'image' && selectedAsset.metaHash) {
            creativePayload.object_story_spec.link_data.image_hash = selectedAsset.metaHash;
          } else if (selectedAsset.type === 'video' && selectedAsset.metaVideoId) {
            creativePayload.object_story_spec.link_data.video_id = selectedAsset.metaVideoId;
            // For videos, call_to_action might be part of link_data directly or attachment
            // Also, 'name' (headline) and 'description' might be at different levels for video creatives.
            // Adjust if Meta API requires a different structure for video ads.
            // Consider if title is needed for video_data if not using link_data structure.
          } else {
             throw new Error('Selected asset is missing metaHash (for image) or metaVideoId (for video).')
          }
          
          if (instagramActorId) {
            creativePayload.object_story_spec.instagram_actor_id = instagramActorId;
          }
          
          // For some objectives, like app installs, you might need 'object_type' and 'object_id' (e.g. for app store link)
          // For lead forms, 'leadgen_form_id' is needed in object_story_spec
          // This example assumes a common link click/conversion ad. Adjust for other types.

          // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
          const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
          const creativeApiUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/adcreatives`;
          console.log(`[Launch API]     Creating Ad Creative for ${draft.adName}... URL: ${creativeApiUrl.split('?')[0]}`);

          const creativeResponse = await fetch(creativeApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativePayload),
          });
          const creativeResult = await creativeResponse.json() as AdCreativeResponse;

          if (!creativeResponse.ok || creativeResult.error) {
            console.error(`[Launch API]     Error creating Ad Creative for ${draft.adName}:`, creativeResult.error || creativeResult);
            throw new Error(creativeResult.error?.message || `Failed to create Ad Creative for ${draft.adName}. Response: ${JSON.stringify(creativeResult)}`);
          }

          adCreativeId = creativeResult.id;
          if (!adCreativeId) {
            console.error(`[Launch API]     Ad Creative ID not found in response for ${draft.adName}:`, creativeResult);
            throw new Error('Ad Creative ID not found in Meta response.');
          }
          console.log(`[Launch API]     Ad Creative created for ${draft.adName}. ID: ${adCreativeId}`);
          finalStatus = 'CREATIVE_CREATED';

          // 3. Create Ad
          try {
            const adPayload = {
              name: draft.adName,
              adset_id: draft.adSetId,
              creative: { creative_id: adCreativeId },
              status: draft.status || 'PAUSED', // Default to PAUSED if not specified
              access_token: accessToken,
              // Optionally, include tracking_specs if a Meta Pixel ID is available
              // tracking_specs: [{ 'action.type':['offsite_conversion'], 'fb_pixel':[YOUR_PIXEL_ID] }],
            };

            const adApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${draft.adSetId}/ads`;
            console.log(`[Launch API]     Creating Ad for ${draft.adName} under Ad Set ${draft.adSetId}... URL: ${adApiUrl.split('?')[0]}`);

            const adResponse = await fetch(adApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(adPayload),
            });
            const adResult = await adResponse.json() as AdResponse;

            if (!adResponse.ok || adResult.error) {
              console.error(`[Launch API]     Error creating Ad for ${draft.adName}:`, adResult.error || adResult);
              throw new Error(adResult.error?.message || `Failed to create Ad for ${draft.adName}. Response: ${JSON.stringify(adResult)}`);
            }
            
            adId = adResult.id;
            if (!adId) {
              console.error(`[Launch API]     Ad ID not found in response for ${draft.adName}:`, adResult);
              throw new Error('Ad ID not found in Meta response.');
            }
            console.log(`[Launch API]     Ad created for ${draft.adName}. ID: ${adId}`);
            finalStatus = 'AD_CREATED';

          } catch (err) {
            console.error(`[Launch API]     Ad creation failed for ${draft.adName}:`, err);
            finalStatus = 'AD_CREATION_FAILED';
            adError = (err as Error).message;
          }
        } catch (err) {
          console.error(`[Launch API]     Ad Creative creation failed for ${draft.adName}:`, err);
          finalStatus = 'CREATIVE_FAILED';
          creativeError = (err as Error).message;
        }
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
        adCreativeId: adCreativeId,
        adId: adId,
        creativeError: creativeError,
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