import { NextRequest, NextResponse } from 'next/server';
import { AdDraft, AdDraftAsset } from '@/components/ad-upload-tool/adUploadTypes';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { sendSlackNotification } from '@/lib/utils/slackNotifications';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  thumbnailUrl?: string; // Add thumbnail URL for videos
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
const checkVideoStatus = async (videoId: string, accessToken: string): Promise<{ ready: boolean; status?: string; error?: string }> => {
  try {
    const videoApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${videoId}?fields=status,upload_errors&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(videoApiUrl);
    
    if (!response.ok) {
      // Handle different HTTP error codes appropriately
      if (response.status === 400) {
        // 400 Bad Request usually means invalid video ID or video not found
        // This is a permanent failure, not a temporary issue
        console.error(`[Launch API] Video ${videoId} returned 400 Bad Request - likely invalid or deleted video`);
        return { 
          ready: false, 
          status: 'error',
          error: `Video not found or invalid (HTTP 400)` 
        };
      } else if (response.status === 403) {
        // 403 Forbidden - permissions issue or video access denied
        console.error(`[Launch API] Video ${videoId} returned 403 Forbidden - access denied`);
        return { 
          ready: false, 
          status: 'error',
          error: `Video access denied (HTTP 403)` 
        };
      } else if (response.status >= 500) {
        // 5xx errors are typically temporary server issues - can retry
        console.warn(`[Launch API] Video ${videoId} returned server error ${response.status} - will retry`);
        return { ready: false };
      } else {
        // Other 4xx errors are usually permanent client-side issues
        console.error(`[Launch API] Video ${videoId} returned ${response.status} - treating as permanent failure`);
        return { 
          ready: false, 
          status: 'error',
          error: `Video check failed (HTTP ${response.status})` 
        };
      }
    }
    
    const data = await response.json();
    const status = data.status?.video_status || data.status;
    const uploadErrors = data.upload_errors;
    
    // Log detailed status information
    if (uploadErrors && uploadErrors.length > 0) {
      console.error(`[Launch API] Video ${videoId} has upload errors:`, uploadErrors);
    }
    
    console.log(`[Launch API] Video ${videoId} status: ${status}${uploadErrors ? `, errors: ${JSON.stringify(uploadErrors)}` : ''}`);
    
    // Video is ready when status is 'ready' or 'published'
    // If status is 'error', include the error information
    if (status === 'error') {
      const errorMessage = uploadErrors && uploadErrors.length > 0 
        ? uploadErrors.map((err: { message?: string; error_message?: string }) => err.message || err.error_message || 'Unknown error').join(', ')
        : 'Video processing failed';
      return { 
        ready: false, 
        status: status,
        error: errorMessage 
      };
    }
    
    return { 
      ready: status === 'ready' || status === 'published',
      status: status
    };
  } catch (error) {
    console.warn(`[Launch API] Error checking video status for ${videoId}:`, error);
    // Network errors or parsing errors - treat as temporary issues (can retry)
    return { ready: false };
  }
};

// Helper function to wait for videos to be ready with timeout
const waitForVideosToBeReady = async (videoIds: string[], accessToken: string, maxWaitTimeMs: number = 300000): Promise<{ allReady: boolean; notReadyVideos: string[]; erroredVideos: string[] }> => {
  const startTime = Date.now();
  const notReadyVideos: string[] = [];
  const erroredVideos: string[] = [];
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    notReadyVideos.length = 0; // Clear the array
    erroredVideos.length = 0; // Clear the array
    
    for (const videoId of videoIds) {
      const { ready, status, error } = await checkVideoStatus(videoId, accessToken);
      if (!ready) {
        if (status === 'error') {
          console.error(`[Launch API] Video ${videoId} failed processing: ${error}`);
          erroredVideos.push(videoId);
        } else {
          notReadyVideos.push(videoId);
        }
      }
    }
    
    // If all videos are either ready or errored, break out
    if (notReadyVideos.length === 0) {
      return { allReady: erroredVideos.length === 0, notReadyVideos: [], erroredVideos };
    }
    
    // Wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  return { allReady: false, notReadyVideos, erroredVideos };
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

// Helper function to upload large videos using Meta's Resumable Upload API
async function uploadVideoUsingResumableAPI(
  assetBlob: Blob, 
  assetName: string, 
  adAccountId: string, 
  accessToken: string
): Promise<{ videoId?: string; error?: string }> {
  try {
    console.log(`[Launch API]     Using Resumable Upload API for video: ${assetName} (${(assetBlob.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
    
    // Step 1: Initialize upload session
    console.log(`[Launch API]       Step 1: Initializing upload session...`);
    const initUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/video_ads`;
    const initParams = new URLSearchParams({
      upload_phase: 'start',
      access_token: accessToken
    });

    const initResponse = await fetch(initUrl, {
      method: 'POST',
      body: initParams
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error(`[Launch API]       Failed to initialize upload session:`, {
        status: initResponse.status,
        statusText: initResponse.statusText,
        error: errorText
      });
      return { error: `Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}` };
    }

    const initResult = await initResponse.json();
    if (initResult.error) {
      console.error(`[Launch API]       Upload initialization error:`, initResult.error);
      return { error: initResult.error.message || 'Failed to initialize upload session' };
    }

    const { video_id: videoId, upload_url: uploadUrl } = initResult;
    if (!videoId || !uploadUrl) {
      console.error(`[Launch API]       Missing video_id or upload_url in response:`, initResult);
      return { error: 'Invalid response from upload initialization' };
    }

    console.log(`[Launch API]       Step 2: Uploading video to ${uploadUrl}...`);
    
    // Step 2: Upload the video file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'offset': '0',
        'file_size': assetBlob.size.toString()
      },
      body: assetBlob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`[Launch API]       Failed to upload video:`, {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      });
      return { error: `Failed to upload video: ${uploadResponse.status} ${uploadResponse.statusText}` };
    }

    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      console.error(`[Launch API]       Video upload was not successful:`, uploadResult);
      return { error: 'Video upload was not successful' };
    }

    console.log(`[Launch API]       Step 3: Finishing upload session...`);
    
    // Step 3: Finish the upload session to publish the video
    const finishParams = new URLSearchParams({
      upload_phase: 'finish',
      video_id: videoId,
      access_token: accessToken
    });

    const finishResponse = await fetch(initUrl, {
      method: 'POST',
      body: finishParams
    });

    if (!finishResponse.ok) {
      const errorText = await finishResponse.text();
      console.error(`[Launch API]       Failed to finish upload session:`, {
        status: finishResponse.status,
        statusText: finishResponse.statusText,
        error: errorText
      });
      return { error: `Failed to finish upload: ${finishResponse.status} ${finishResponse.statusText}` };
    }

    const finishResult = await finishResponse.json();
    if (!finishResult.success) {
      console.error(`[Launch API]       Upload session finish was not successful:`, finishResult);
      return { error: 'Failed to finish upload session' };
    }

    console.log(`[Launch API]       Video upload completed successfully. ID: ${videoId}`);
    return { videoId };

  } catch (error) {
    console.error(`[Launch API]       Error in Resumable Upload API:`, error);
    return { error: `Resumable upload failed: ${(error as Error).message}` };
  }
}

// Function to find video thumbnail (client-side uploaded)
const findVideoThumbnail = async (videoName: string, conceptId: string, supabase: SupabaseClient): Promise<{ thumbnailUrl?: string; error?: string }> => {
  try {
    console.log(`[Launch API]       Looking for thumbnail for video: ${videoName}`);
    
    // Extract base name from video (remove extension and common suffixes)
    const baseName = videoName.split('.')[0].replace(/_compressed|_comp|-compressed|-comp/g, '');
    const thumbnailName = `${baseName}_thumbnail.jpg`;
    
    // List files in the concept folder to find the thumbnail
    const { data: files, error } = await supabase.storage
      .from('ad-creatives')
      .list(conceptId, {
        limit: 100,
        search: thumbnailName
      });
    
    if (error) {
      console.warn(`[Launch API]       Error listing files to find thumbnail: ${error.message}`);
      return { error: `Could not search for thumbnail: ${error.message}` };
    }
    
    // Look for the thumbnail file
    const thumbnailFile = files?.find(file => file.name.includes('_thumbnail.jpg'));
    
    if (thumbnailFile) {
      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(`${conceptId}/${thumbnailFile.name}`);
      
      if (publicUrl) {
        console.log(`[Launch API]       Found thumbnail for ${videoName}: ${publicUrl}`);
        return { thumbnailUrl: publicUrl };
      }
    }
    
    console.log(`[Launch API]       No thumbnail found for video: ${videoName}`);
    return { error: 'No thumbnail found for video' };
    
  } catch (error) {
    console.warn(`[Launch API]       Error finding thumbnail for ${videoName}:`, error);
    return { error: `Thumbnail search failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Function to upload image URL as Meta ad image
const uploadImageUrlToMeta = async (imageUrl: string, imageName: string, adAccountId: string, accessToken: string): Promise<{ imageHash?: string; error?: string }> => {
  try {
    console.log(`[Launch API]       Uploading image from URL to Meta: ${imageName}`);
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { error: `Failed to fetch image: ${imageResponse.statusText}` };
    }
    
    const imageBlob = await imageResponse.blob();
    
    // Upload to Meta
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
    
    const formData = new FormData();
    formData.append('access_token', accessToken);
    formData.append('source', imageBlob, `${imageName}_thumbnail.jpg`);

    const metaUploadUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/adimages`;
    
    console.log(`[Launch API]       Uploading thumbnail to Meta for ${imageName}...`);
    const metaResponse = await fetch(metaUploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      return { error: `Thumbnail upload failed: ${metaResponse.status} ${metaResponse.statusText} - ${errorText}` };
    }

    const result = await metaResponse.json();
    
    if (result.error) {
      return { error: `Thumbnail upload error: ${result.error.message}` };
    }

    // Extract image hash from response
    const imageHash = result.images?.[Object.keys(result.images)[0]]?.hash;
    
    if (!imageHash) {
      return { error: 'No image hash returned from Meta thumbnail upload' };
    }

    console.log(`[Launch API]       Thumbnail uploaded successfully to Meta. Hash: ${imageHash}`);
    return { imageHash };
    
  } catch (error) {
    return { error: `Thumbnail upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

          // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
          const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
          
          if (asset.type === 'image') {
            // Use existing direct upload for images
            const formData = new FormData();
            formData.append('access_token', accessToken);
            formData.append('source', assetBlob, asset.name);

            const metaUploadUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/adimages`;

            console.log(`[Launch API]     Uploading image ${asset.name} to ${metaUploadUrl.split('?')[0]}...`);
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

            const imageHash = metaResult.images?.[asset.name]?.hash;
            if (!imageHash) {
              console.error('[Launch API]     Could not find image hash in Meta response for:', asset.name, metaResult);
              updatedAssets.push({ ...asset, metaUploadError: 'Image hash not found in Meta response' });
              continue;
            }
            console.log(`[Launch API]     Image ${asset.name} uploaded. Hash: ${imageHash}`);
            updatedAssets.push({ ...asset, metaHash: imageHash });

          } else if (asset.type === 'video') {
            // Always use Resumable Upload API for videos - it supports larger files (up to 10GB)
            // and is more reliable than direct upload which has size limitations that cause 413 errors
            const { videoId, error } = await uploadVideoUsingResumableAPI(assetBlob, asset.name, adAccountId, accessToken);
            
            if (error) {
              console.error(`[Launch API]     Failed to upload video ${asset.name}:`, error);
              updatedAssets.push({ ...asset, metaUploadError: error });
              continue;
            }

            if (!videoId) {
              console.error('[Launch API]     Video upload succeeded but no video ID returned for:', asset.name);
              updatedAssets.push({ ...asset, metaUploadError: 'Video ID not found in Meta response' });
              continue;
            }

            console.log(`[Launch API]     Video ${asset.name} uploaded using Resumable API. ID: ${videoId}`);
            // Videos uploaded via video_ads endpoint are ready immediately for ad use
            // No status checking needed unlike regular video uploads
            updatedAssets.push({ ...asset, metaVideoId: videoId });

          } else {
            console.warn(`[Launch API]     Unsupported asset type: ${asset.type} for asset ${asset.name}`);
            updatedAssets.push({ ...asset, metaUploadError: 'Unsupported type' });
            continue;
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
        console.log(`[Launch API]     Multiple aspect ratios detected with videos - using simplified approach`);
        
        // For videos uploaded via video_ads endpoint, use simpler object_story_spec approach
        // instead of asset_feed_spec to avoid compatibility issues
        const hasVideos = [...feedAssets, ...storyAssets].some(asset => asset.type === 'video');
        
        if (hasVideos) {
          console.log(`[Launch API]     Videos detected - using object_story_spec instead of asset_feed_spec`);
          
          // Use the first available asset (prefer feed assets, then story assets)
          const primaryAsset = feedAssets.length > 0 ? feedAssets[0] : storyAssets[0];
          
          if (primaryAsset.type === 'image' && primaryAsset.metaHash) {
            creativeSpec.object_story_spec.link_data = {
              message: draft.primaryText,
              link: draft.destinationUrl,
              call_to_action: {
                type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
                value: { link: draft.destinationUrl },
              },
              name: draft.headline,
              ...(draft.description && { description: draft.description }),
              image_hash: primaryAsset.metaHash
            };
          } else if (primaryAsset.type === 'video' && primaryAsset.metaVideoId) {
            // Get video thumbnail
            let thumbnailHash: string | undefined;
            try {
              // Find the original asset in the draft to get concept ID for thumbnail search
              const originalAsset = (draft.assets as ProcessedAdDraftAsset[]).find(
                a => a.metaVideoId === primaryAsset.metaVideoId
              );
              
              if (originalAsset) {
                // First try to find a pre-uploaded thumbnail
                const thumbnailResult = await findVideoThumbnail(originalAsset.name, draft.id, supabase);
                
                if (thumbnailResult.thumbnailUrl) {
                  // Upload the found thumbnail to Meta
                  const uploadResult = await uploadImageUrlToMeta(
                    thumbnailResult.thumbnailUrl,
                    originalAsset.name,
                    adAccountId,
                    accessToken
                  );
                  
                  if (uploadResult.error) {
                    console.warn(`[Launch API]     Could not upload thumbnail for ${originalAsset.name}: ${uploadResult.error}`);
                  } else {
                    thumbnailHash = uploadResult.imageHash;
                    console.log(`[Launch API]     Using uploaded thumbnail for video: ${originalAsset.name}`);
                  }
                } else {
                  console.warn(`[Launch API]     No thumbnail found for ${originalAsset.name}: ${thumbnailResult.error}`);
                }
              }
            } catch (thumbnailError) {
              console.warn(`[Launch API]     Could not process thumbnail for ${primaryAsset.name}:`, thumbnailError);
            }
            
            creativeSpec.object_story_spec.video_data = {
              video_id: primaryAsset.metaVideoId,
              message: draft.primaryText,
              call_to_action: {
                type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
                value: { link: draft.destinationUrl },
              },
              title: draft.headline,
              ...(thumbnailHash && { image_hash: thumbnailHash })
            };
          }
          
          // Remove asset_feed_spec for video compatibility
          delete creativeSpec.asset_feed_spec;
          console.log(`[Launch API]     Using primary asset: ${primaryAsset.name} (${primaryAsset.type})`);
          
        } else {
          // No videos - use original asset_feed_spec approach for images
          console.log(`[Launch API]     No videos - using asset_feed_spec for placement customization`);
          
          // Add feed assets
          feedAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
            const assetLabel = `feed_asset_${index}`;
            if (asset.type === 'image' && asset.metaHash) {
              creativeSpec.asset_feed_spec.images.push({
                hash: asset.metaHash,
                adlabels: [{ name: assetLabel }]
              });
              creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_IMAGE');
            }

            // Add customization rule for feed placements
            creativeSpec.asset_feed_spec.asset_customization_rules.push({
              customization_spec: {
                publisher_platforms: ['facebook', 'instagram'],
                facebook_positions: ['feed', 'video_feeds'],
                instagram_positions: ['stream', 'explore']
              },
              image_label: { name: assetLabel }
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
            }

            // Add customization rule for story placements
            creativeSpec.asset_feed_spec.asset_customization_rules.push({
              customization_spec: {
                publisher_platforms: ['facebook', 'instagram'],
                facebook_positions: ['story'],
                instagram_positions: ['story']
              },
              image_label: { name: assetLabel }
            });
          });
        }

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
          // Get video thumbnail  
          let thumbnailHash: string | undefined;
          try {
            // Find the original asset in the draft to get concept ID for thumbnail search
            const originalAsset = (draft.assets as ProcessedAdDraftAsset[]).find(
              a => a.metaVideoId === selectedAsset.metaVideoId
            );
            
            if (originalAsset) {
              // First try to find a pre-uploaded thumbnail
              const thumbnailResult = await findVideoThumbnail(originalAsset.name, draft.id, supabase);
              
              if (thumbnailResult.thumbnailUrl) {
                // Upload the found thumbnail to Meta
                const uploadResult = await uploadImageUrlToMeta(
                  thumbnailResult.thumbnailUrl,
                  originalAsset.name,
                  adAccountId,
                  accessToken
                );
                
                if (uploadResult.error) {
                  console.warn(`[Launch API]     Could not upload thumbnail for ${originalAsset.name}: ${uploadResult.error}`);
                } else {
                  thumbnailHash = uploadResult.imageHash;
                  console.log(`[Launch API]     Using uploaded thumbnail for video: ${originalAsset.name}`);
                }
              } else {
                console.warn(`[Launch API]     No thumbnail found for ${originalAsset.name}: ${thumbnailResult.error}`);
              }
            }
          } catch (thumbnailError) {
            console.warn(`[Launch API]     Could not process thumbnail for ${selectedAsset.name}:`, thumbnailError);
          }
          
          creativeSpec.object_story_spec.video_data = {
            video_id: selectedAsset.metaVideoId,
            message: draft.primaryText,
            call_to_action: {
              type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
              value: { link: draft.destinationUrl },
            },
            title: draft.headline,
            ...(thumbnailHash && { image_hash: thumbnailHash })
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
        console.log(`[Launch API]     Found ${videoIds.length} videos uploaded via video_ads endpoint`);
        console.log(`[Launch API]     Videos uploaded via video_ads are ready immediately for ad use - skipping status check`);
        
        // Videos uploaded via video_ads endpoint are ready immediately for ad use
        // No need to poll for status like regular video uploads
        // Proceeding directly to ad creation...
      }

      // Validate ad set exists and get its campaign info for logging
      try {
        // Step 1: Get ad set data including campaign_id
        const adSetApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${draft.adSetId}?fields=id,name,status,effective_status,campaign_id,dsa_payor,dsa_beneficiary&access_token=${encodeURIComponent(accessToken)}`;
        console.log(`[Launch API]     Validating ad set ${draft.adSetId}...`);
        
        const adSetResponse = await fetch(adSetApiUrl);
        if (!adSetResponse.ok) {
          const errorText = await adSetResponse.text();
          console.error(`[Launch API] Ad set validation error response:`, errorText);
          throw new Error(`Ad set validation failed: ${adSetResponse.status} ${adSetResponse.statusText} - ${errorText}`);
        }
        
        const adSetData = await adSetResponse.json();
        if (adSetData.error) {
          throw new Error(`Ad set error: ${adSetData.error.message}`);
        }
        
        console.log(`[Launch API]     Ad set validated: ${adSetData.name} (Campaign: ${adSetData.campaign_id})`);

        // Note: DSA and regional regulation settings are handled at ad set level or by Meta automatically
        // Creative spec should only contain visual/content elements
        console.log(`[Launch API]     Building creative spec with visual/content elements only`);

        // Step 2: Create Ad with inline creative spec
        const adApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/ads`;
        console.log(`[Launch API]     Creating ad for ${draft.adName} with inline creative...`);

        // Debug: Log the creative spec to see the final fields being sent
        console.log(`[Launch API]     Creative spec debug:`, JSON.stringify(creativeSpec, null, 2));

        const adParams = {
          access_token: accessToken,
          name: draft.adName,
          adset_id: draft.adSetId,
          creative: JSON.stringify(creativeSpec), // Pass the full creativeSpec here
          status: draft.status.toUpperCase() // Use the draft's status (ACTIVE/PAUSED)
        };

        const adResponse = await fetch(adApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(adParams)
        });

        if (!adResponse.ok) {
          const errorText = await adResponse.text();
          throw new Error(`Ad creation failed: ${adResponse.status} ${adResponse.statusText} - ${errorText}`);
        }

        const adResponseData = await adResponse.json() as AdResponse;
        if (adResponseData.error) {
          throw new Error(`Ad creation error: ${adResponseData.error.message}`);
        }

        adId = adResponseData.id;
        // Since creative is created inline, we can't get its ID separately here
        // But the ad creation succeeded, so we mark as PUBLISHED
        finalStatus = 'PUBLISHED'; 
        console.log(`[Launch API] Successfully created ad: ${adId} for draft: ${draft.adName} (creative created inline)`);
        
      } catch (error) {
        console.error(`[Launch API] Error processing draft ${draft.adName}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Debug logging to understand error detection
        console.log(`[Launch API] Error message for ${draft.adName}: "${errorMessage}"`);
        
        // Check if assets were uploaded successfully
        const hasUploadedAssets = (draft.assets as ProcessedAdDraftAsset[]).some(
          asset => (asset.metaHash || asset.metaVideoId) && !asset.metaUploadError
        );
        
        console.log(`[Launch API] Has uploaded assets: ${hasUploadedAssets}`);
        
        // Determine if this is a configuration/validation error vs upload failure
        const isConfigurationError = errorMessage.includes('regional_regulation') || 
                                    errorMessage.includes('Invalid parameter') ||
                                    errorMessage.includes('OAuthException') ||
                                    // Note: We don't have a separate creative creation step anymore
                                    // errorMessage.includes('Creative creation failed') ||
                                    errorMessage.includes('Ad creation failed') ||
                                    errorMessage.includes('Ad set validation failed') ||
                                    errorMessage.includes('dsa_payor') ||
                                    errorMessage.includes('dsa_beneficiary');
        
        console.log(`[Launch API] Is configuration error: ${isConfigurationError}`);
        
        if (hasUploadedAssets && !isConfigurationError) {
          // Assets uploaded but ad creation failed due to non-configuration issues
          finalStatus = 'UPLOADED';
          adError = errorMessage;
          console.log(`[Launch API] Assets uploaded but ad creation failed for ${draft.adName}, marking as UPLOADED`);
        } else {
          // Configuration error, validation error, or upload failure
          finalStatus = 'ERROR';
          adError = errorMessage;
          if (isConfigurationError) {
            console.log(`[Launch API] Configuration/validation error for ${draft.adName}, marking as ERROR`);
          } else {
            console.log(`[Launch API] Upload or other error for ${draft.adName}, marking as ERROR`);
          }
        }
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
        let dbStatus: string;
        if (finalStatus === 'PUBLISHED') {
          dbStatus = 'PUBLISHED';
        } else if (finalStatus === 'UPLOADED') {
          dbStatus = 'UPLOADED';
        } else {
          dbStatus = 'ERROR';
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

    // Send Slack notification about the batch processing results
    try {
      const successCount = processingResults.filter(r => r.status === 'PUBLISHED').length;
      const failureCount = processingResults.length - successCount;

      // Get campaign and ad set names for the first draft (assuming they are the same for the batch)
      const firstDraft = draftsWithMetaAssets[0]; // Get the first draft from the processed list
      const campaignName = firstDraft?.campaignName;
      const adSetName = firstDraft?.adSetName;
      
      await sendSlackNotification({
        brandId,
        batchName: 'Ad Launch Batch', // You might want to make this dynamic if batches have names
        campaignId: firstDraft?.campaignId,
        adSetId: firstDraft?.adSetId,
        campaignName,
        adSetName,
        launchedAds: processingResults,
        totalAds: processingResults.length,
        successfulAds: successCount,
        failedAds: failureCount
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
        successful: processingResults.filter(r => r.status === 'PUBLISHED').length,
        uploaded: processingResults.filter(r => r.status === 'UPLOADED').length,
        failed: processingResults.filter(r => !['PUBLISHED', 'UPLOADED'].includes(r.status)).length
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