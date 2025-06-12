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
console.log(`[Launch API] Using Meta API version: ${META_API_VERSION}`);

// Helper function to extract aspect ratio from filename as fallback
const detectAspectRatioFromFilename = (filename: string): string | null => {
  const identifiers = [
    // Common patterns with common separators
    '1x1', '9x16', '16x9', '4x5', '5x4', '2x3', '3x2',
    '1:1', '9:16', '16:9', '4:5', '5:4', '2:3', '3:2',
    // Handle decimal ratios
    '1.0x1.0', '9.0x16.0', '16.0x9.0', '4.0x5.0'
  ];
  
  for (const id of identifiers) {
    const patternsToTest = [
      `_${id}`,
      `-${id}`,
      ` - ${id}`,
      `:${id}`,
      `(${id})`,
      `(${id}`,
      `.${id}`,
      `[${id}]`,
      ` ${id} `,
      `_${id}_`,
      `-${id}-`,
      // Case insensitive patterns
      `_${id.toUpperCase()}`,
      `-${id.toUpperCase()}`,
      ` - ${id.toUpperCase()}`,
    ];
    
    for (const pattern of patternsToTest) {
      if (filename.toLowerCase().includes(pattern.toLowerCase())) {
        return id.replace('x', ':'); // Normalize to colon format
      }
    }
  }
  
  return null;
};

// Helper function to validate video dimensions and suggest missing aspect ratios
const validateVideoForAspectRatio = (filename: string, aspectRatio: string | null): { isValid: boolean; suggestions: string[] } => {
  const requiredAspectRatios = ['1:1', '9:16', '16:9', '4:5'];
  const suggestions: string[] = [];
  
  if (!aspectRatio) {
    suggestions.push('Consider adding aspect ratio to filename (e.g., video_9x16.mp4, video_16x9.mp4)');
    suggestions.push('Required aspect ratios: ' + requiredAspectRatios.join(', '));
    return { isValid: false, suggestions };
  }
  
  const normalizedRatio = aspectRatio.replace('x', ':');
  if (!requiredAspectRatios.includes(normalizedRatio)) {
    suggestions.push(`Aspect ratio ${normalizedRatio} may not be optimal for Meta ads`);
    suggestions.push('Recommended aspect ratios: ' + requiredAspectRatios.join(', '));
  }
  
  return { isValid: true, suggestions };
};

// Helper function to check if a video is ready for use in ads
const checkVideoStatus = async (videoId: string, accessToken: string): Promise<{ ready: boolean; status?: string; error?: string }> => {
  try {
    const videoApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${videoId}?fields=status&access_token=${encodeURIComponent(accessToken)}`;
    console.log(`[Launch API] Checking video status: ${videoApiUrl.split('?')[0]}`);
    
    const response = await fetch(videoApiUrl);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Launch API] Video status check failed:`, {
        videoId,
        status: response.status,
        statusText: response.statusText,
        body: errorBody.substring(0, 500)
      });
      
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
    console.log(`[Launch API] Video ${videoId} raw status response:`, JSON.stringify(data, null, 2));
    
    // Parse the nested status structure according to Meta's documentation
    const videoStatus = data.status?.video_status || 'unknown';
    const uploadingPhase = data.status?.uploading_phase;
    const processingPhase = data.status?.processing_phase;
    const publishingPhase = data.status?.publishing_phase;
    
    // Log detailed status information
    console.log(`[Launch API] Video ${videoId} status:`, {
      video_status: videoStatus,
      uploading: uploadingPhase?.status || 'unknown',
      processing: processingPhase?.status || 'unknown',
      publishing: publishingPhase?.status || 'unknown'
    });
    
    // Video is ready when video_status is 'ready' or publishing phase is 'complete'
    // According to Meta docs, video_status can be: ready, processing, expired, error
    if (videoStatus === 'error' || uploadingPhase?.status === 'error' || processingPhase?.status === 'error') {
      const errorDetails = [];
      
      // Check for specific processing errors
      if (processingPhase?.errors && Array.isArray(processingPhase.errors)) {
        processingPhase.errors.forEach((err: { code?: number; message?: string }) => {
          if (err.message) {
            errorDetails.push(err.message);
          }
        });
      }
      
      // If no specific errors found, use generic messages
      if (errorDetails.length === 0) {
        if (uploadingPhase?.status === 'error') errorDetails.push('upload failed');
        if (processingPhase?.status === 'error') errorDetails.push('processing failed');
        if (publishingPhase?.status === 'error') errorDetails.push('publishing failed');
      }
      
      const errorMessage = errorDetails.length > 0 
        ? `Video processing failed: ${errorDetails.join('; ')}`
        : 'Video processing failed';
      
      console.error(`[Launch API] Video ${videoId} processing errors:`, errorDetails);
      
      return { 
        ready: false, 
        status: 'error',
        error: errorMessage
      };
    }
    
    // Check for expired videos
    if (videoStatus === 'expired') {
      return { 
        ready: false, 
        status: 'error',
        error: 'Video has expired and is no longer available' 
      };
    }
    
    return { 
      ready: videoStatus === 'ready',
      status: videoStatus
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
  let checkCount = 0;
  
  console.log(`[Launch API] Starting video readiness check for ${videoIds.length} videos with ${maxWaitTimeMs}ms timeout`);
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    checkCount++;
    notReadyVideos.length = 0; // Clear the array
    erroredVideos.length = 0; // Clear the array
    
    console.log(`[Launch API] Video status check #${checkCount} (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);
    
    for (const videoId of videoIds) {
      const { ready, status, error } = await checkVideoStatus(videoId, accessToken);
      console.log(`[Launch API]   Video ${videoId}: ready=${ready}, status=${status}, error=${error || 'none'}`);
      
      if (!ready) {
        if (status === 'error') {
          console.error(`[Launch API]   Video ${videoId} failed processing: ${error}`);
          erroredVideos.push(videoId);
        } else {
          notReadyVideos.push(videoId);
        }
      }
    }
    
    console.log(`[Launch API] Check #${checkCount} summary: ${videoIds.length - notReadyVideos.length - erroredVideos.length} ready, ${notReadyVideos.length} processing, ${erroredVideos.length} errored`);
    
    // If all videos are either ready or errored, break out
    if (notReadyVideos.length === 0) {
      console.log(`[Launch API] All videos have finished processing (${erroredVideos.length} errors)`);
      return { allReady: erroredVideos.length === 0, notReadyVideos: [], erroredVideos };
    }
    
    // Wait 10 seconds before checking again
    console.log(`[Launch API] Waiting 10 seconds before next check...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log(`[Launch API] Timeout reached after ${checkCount} checks and ${Math.round((Date.now() - startTime) / 1000)}s`);
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

// Helper function to check upload status and get bytes transferred
async function checkUploadStatus(videoId: string, accessToken: string): Promise<{ bytesTransferred: number; status: string; error?: string }> {
  try {
    const statusUrl = `https://graph.facebook.com/${META_API_VERSION}/${videoId}?fields=status&access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(statusUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Launch API] Failed to check upload status:`, {
        videoId,
        status: response.status,
        error: errorText.substring(0, 200)
      });
      return { bytesTransferred: 0, status: 'error', error: `Status check failed: ${response.status}` };
    }
    
    const data = await response.json();
    const uploadingPhase = data.status?.uploading_phase || {};
    const bytesTransferred = uploadingPhase.bytes_transferred || uploadingPhase.bytes_transfered || 0; // Handle typo in API
    const status = uploadingPhase.status || 'unknown';
    
    console.log(`[Launch API] Upload status for ${videoId}:`, {
      status,
      bytesTransferred,
      fullUploadingPhase: uploadingPhase
    });
    
    return { bytesTransferred, status };
  } catch (error) {
    console.error(`[Launch API] Error checking upload status:`, error);
    return { bytesTransferred: 0, status: 'error', error: (error as Error).message };
  }
}

// Helper function to upload video using file URL (alternative method)
async function uploadVideoUsingFileUrl(
  videoUrl: string,
  assetName: string,
  adAccountId: string,
  accessToken: string
): Promise<{ videoId?: string; error?: string }> {
  try {
    console.log(`[Launch API]     Using File URL Upload method for video: ${assetName}`);
    console.log(`[Launch API]       Video URL: ${videoUrl}`);
    
    // Ensure adAccountId has the proper format
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
    
    // Step 1: Initialize upload session
    console.log(`[Launch API]       Step 1: Initializing upload session for URL upload...`);
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
      console.error(`[Launch API]       Failed to initialize URL upload session:`, errorText);
      return { error: `Failed to initialize URL upload: ${initResponse.status}` };
    }

    const initResult = await initResponse.json();
    if (initResult.error) {
      return { error: initResult.error.message || 'Failed to initialize URL upload session' };
    }

    const { video_id: videoId, upload_url: uploadUrl } = initResult;
    if (!videoId || !uploadUrl) {
      return { error: 'Invalid response from URL upload initialization' };
    }

    console.log(`[Launch API]       Init successful - Video ID: ${videoId}`);
    console.log(`[Launch API]       Step 2: Uploading video from URL...`);
    
    // Step 2: Upload using file_url
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${accessToken}`,
        'file_url': videoUrl
      }
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`[Launch API]       Failed to upload video from URL:`, errorText);
      return { error: `Failed to upload from URL: ${uploadResponse.status}` };
    }

    const uploadResult = await uploadResponse.json();
    if (!uploadResult.success) {
      return { error: 'Video URL upload was not successful' };
    }

    console.log(`[Launch API]       URL upload successful`);
    console.log(`[Launch API]       Step 3: Finishing upload session...`);
    
    // Step 3: Finish the upload session
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
      console.error(`[Launch API]       Failed to finish URL upload session:`, errorText);
      return { error: `Failed to finish URL upload: ${finishResponse.status}` };
    }

    const finishResult = await finishResponse.json();
    if (!finishResult.success) {
      return { error: 'Failed to finish URL upload session' };
    }

    console.log(`[Launch API]       Video URL upload completed successfully. ID: ${videoId}`);
    return { videoId };

  } catch (error) {
    console.error(`[Launch API]       Error in URL Upload:`, error);
    return { error: `URL upload failed: ${(error as Error).message}` };
  }
}

// Helper function to upload large videos using Meta's Resumable Upload API
async function uploadVideoUsingResumableAPI(
  assetBlob: Blob, 
  assetName: string, 
  adAccountId: string, 
  accessToken: string
): Promise<{ videoId?: string; error?: string }> {
  try {
    console.log(`[Launch API]     Using Resumable Upload API for video: ${assetName} (${(assetBlob.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Log blob details
    console.log(`[Launch API]       Video blob details:`, {
      size: assetBlob.size,
      type: assetBlob.type,
      name: assetName
    });
    
    // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
    
    // Step 1: Initialize upload session with enhanced parameters
    console.log(`[Launch API]       Step 1: Initializing upload session...`);
    const initUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/video_ads`;
    const initParams = new URLSearchParams({
      upload_phase: 'start',
      file_size: assetBlob.size.toString(),
      access_token: accessToken
    });

    console.log(`[Launch API]       Init URL: ${initUrl}`);
    console.log(`[Launch API]       Init params: file_size=${assetBlob.size}`);

    const initResponse = await fetch(initUrl, {
      method: 'POST',
      body: initParams
    });

    const initResponseText = await initResponse.text();
    console.log(`[Launch API]       Init response status: ${initResponse.status}`);
    console.log(`[Launch API]       Init response: ${initResponseText.substring(0, 200)}...`);

    if (!initResponse.ok) {
      console.error(`[Launch API]       Failed to initialize upload session:`, {
        status: initResponse.status,
        statusText: initResponse.statusText,
        error: initResponseText
      });
      return { error: `Failed to initialize upload: ${initResponse.status} ${initResponse.statusText}` };
    }

    let initResult;
    try {
      initResult = JSON.parse(initResponseText);
    } catch (e) {
      console.error(`[Launch API]       Failed to parse init response:`, e);
      return { error: 'Invalid JSON response from init' };
    }

    if (initResult.error) {
      console.error(`[Launch API]       Upload initialization error:`, initResult.error);
      return { error: initResult.error.message || 'Failed to initialize upload session' };
    }

    const { video_id: videoId, upload_url: uploadUrl } = initResult;
    if (!videoId || !uploadUrl) {
      console.error(`[Launch API]       Missing video_id or upload_url in response:`, initResult);
      return { error: 'Invalid response from upload initialization' };
    }

    console.log(`[Launch API]       Init successful - Video ID: ${videoId}`);
    console.log(`[Launch API]       Step 2: Uploading video to ${uploadUrl}...`);
    
    // Step 2: Upload the video file with retry and resume support
    const MAX_UPLOAD_ATTEMPTS = 3;
    let uploadSuccess = false;
    
    for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
      console.log(`[Launch API]       Upload attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS}`);
      
      // Check if we need to resume from a previous attempt
      let offset = 0;
      if (attempt > 1) {
        console.log(`[Launch API]       Checking upload status for resume...`);
        const { bytesTransferred, status, error: statusError } = await checkUploadStatus(videoId, accessToken);
        
        if (status === 'complete') {
          console.log(`[Launch API]       Upload already complete!`);
          uploadSuccess = true;
          break;
        } else if (status === 'error' || statusError) {
          console.error(`[Launch API]       Upload status check failed:`, statusError || 'Unknown error');
          // Start from beginning on error
          offset = 0;
        } else {
          offset = bytesTransferred;
          console.log(`[Launch API]       Resuming upload from byte ${offset} (${(offset / assetBlob.size * 100).toFixed(1)}% complete)`);
        }
      }
      
      try {
        // Create a slice of the blob if resuming
        const uploadBlob = offset > 0 ? assetBlob.slice(offset) : assetBlob;
        console.log(`[Launch API]       Uploading ${uploadBlob.size} bytes (offset: ${offset}, total: ${assetBlob.size})`);
        
        // Log the exact headers being sent
        const uploadHeaders = {
          'Authorization': `OAuth ${accessToken}`,
          'offset': offset.toString(),
          'file_size': assetBlob.size.toString()
        };
        console.log(`[Launch API]       Upload headers:`, uploadHeaders);
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: uploadHeaders,
          body: uploadBlob
        });

        const uploadResponseText = await uploadResponse.text();
        console.log(`[Launch API]       Upload response status: ${uploadResponse.status}`);
        console.log(`[Launch API]       Upload response: ${uploadResponseText.substring(0, 200)}...`);

        if (!uploadResponse.ok) {
          console.error(`[Launch API]       Failed to upload video (attempt ${attempt}):`, {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: uploadResponseText
          });
          
          // If we get a 4xx error (client error), don't retry
          if (uploadResponse.status >= 400 && uploadResponse.status < 500) {
            return { error: `Upload failed with client error: ${uploadResponse.status} ${uploadResponse.statusText}` };
          }
          
          // For server errors, retry
          if (attempt < MAX_UPLOAD_ATTEMPTS) {
            console.log(`[Launch API]       Will retry after 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          return { error: `Failed to upload video after ${MAX_UPLOAD_ATTEMPTS} attempts: ${uploadResponse.status} ${uploadResponse.statusText}` };
        }

        let uploadResult;
        try {
          uploadResult = JSON.parse(uploadResponseText);
        } catch (e) {
          console.error(`[Launch API]       Failed to parse upload response:`, e);
          if (attempt < MAX_UPLOAD_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          return { error: 'Invalid JSON response from upload' };
        }

        if (!uploadResult.success) {
          console.error(`[Launch API]       Video upload was not successful:`, uploadResult);
          if (attempt < MAX_UPLOAD_ATTEMPTS) {
            console.log(`[Launch API]       Will check status and retry...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          return { error: 'Video upload was not successful' };
        }

        console.log(`[Launch API]       Upload successful on attempt ${attempt}`);
        uploadSuccess = true;
        break;
        
      } catch (error) {
        console.error(`[Launch API]       Upload attempt ${attempt} failed with error:`, error);
        if (attempt < MAX_UPLOAD_ATTEMPTS) {
          console.log(`[Launch API]       Will retry after 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        throw error;
      }
    }
    
    if (!uploadSuccess) {
      return { error: 'Failed to upload video after all retry attempts' };
    }

    // Verify upload is actually complete before finishing
    console.log(`[Launch API]       Verifying upload completion before finishing...`);
    const { bytesTransferred: finalBytes, status: finalStatus } = await checkUploadStatus(videoId, accessToken);
    
    if (finalStatus !== 'complete' && finalBytes < assetBlob.size) {
      console.error(`[Launch API]       Upload not complete! Status: ${finalStatus}, Bytes: ${finalBytes}/${assetBlob.size}`);
      return { error: `Upload incomplete: only ${finalBytes}/${assetBlob.size} bytes transferred` };
    }
    
    console.log(`[Launch API]       Upload verified complete: ${finalBytes}/${assetBlob.size} bytes`);
    console.log(`[Launch API]       Step 3: Finishing upload session...`);
    
    // Step 3: Finish the upload session to publish the video
    const finishParams = new URLSearchParams({
      upload_phase: 'finish',
      video_id: videoId,
      access_token: accessToken
    });

    console.log(`[Launch API]       Finish params: video_id=${videoId}`);

    const finishResponse = await fetch(initUrl, {
      method: 'POST',
      body: finishParams
    });

    const finishResponseText = await finishResponse.text();
    console.log(`[Launch API]       Finish response status: ${finishResponse.status}`);
    console.log(`[Launch API]       Finish response: ${finishResponseText.substring(0, 200)}...`);

    if (!finishResponse.ok) {
      console.error(`[Launch API]       Failed to finish upload session:`, {
        status: finishResponse.status,
        statusText: finishResponse.statusText,
        error: finishResponseText
      });
      return { error: `Failed to finish upload: ${finishResponse.status} ${finishResponse.statusText}` };
    }

    let finishResult;
    try {
      finishResult = JSON.parse(finishResponseText);
    } catch (e) {
      console.error(`[Launch API]       Failed to parse finish response:`, e);
      return { error: 'Invalid JSON response from finish' };
    }

    if (!finishResult.success) {
      console.error(`[Launch API]       Upload session finish was not successful:`, finishResult);
      return { error: 'Failed to finish upload session' };
    }

    // The 'finish' phase success indicates the upload is complete, but the video
    // still needs to go through processing before it's ready for use in ads.
    // The caller should check the video status using the /{VIDEO_ID}?fields=status endpoint
    // to ensure it's in 'ready' or 'published' state before creating ads.
    console.log(`[Launch API]       Video upload completed successfully. ID: ${videoId}. Processing status check required before use.`);
    
    // Add immediate status check to see initial state
    console.log(`[Launch API]       Performing immediate status check...`);
    try {
      const { ready, status, error } = await checkVideoStatus(videoId, accessToken);
      console.log(`[Launch API]       Immediate status check result:`, { ready, status, error });
    } catch (e) {
      console.warn(`[Launch API]       Immediate status check failed:`, e);
    }
    
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
    
    // First, check the database for a thumbnail_url for this specific video asset
    const { data: assetData, error: assetError } = await supabase
      .from('ad_draft_assets')
      .select('thumbnail_url')
      .eq('ad_draft_id', conceptId)
      .eq('name', videoName)
      .eq('type', 'video')
      .single();
    
    if (!assetError && assetData?.thumbnail_url) {
      console.log(`[Launch API]       Found thumbnail in database for ${videoName}: ${assetData.thumbnail_url}`);
      return { thumbnailUrl: assetData.thumbnail_url };
    }
    
    if (assetError && assetError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn(`[Launch API]       Database error searching for thumbnail: ${assetError.message}`);
    } else {
      console.log(`[Launch API]       No thumbnail found in database for ${videoName}, trying file system...`);
    }
    
    // Fallback: search for thumbnail files in storage (legacy method)
    // Extract base name from video (remove extension and common suffixes)
    const baseName = videoName.split('.')[0].replace(/_compressed|_comp|-compressed|-comp/g, '');
    
    // List files in the concept folder to find the thumbnail
    const { data: files, error } = await supabase.storage
      .from('ad-creatives')
      .list(conceptId, {
        limit: 100,
        search: '_thumbnail.jpg'
      });
    
    if (error) {
      console.warn(`[Launch API]       Error listing files to find thumbnail: ${error.message}`);
      return { error: `Could not search for thumbnail: ${error.message}` };
    }
    
    // Look for the thumbnail file
    const thumbnailFile = files?.find(file => 
      file.name.includes('_thumbnail.jpg') && 
      (file.name.includes(baseName) || file.name.includes(videoName.split('.')[0]))
    );
    
    if (thumbnailFile) {
      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(`${conceptId}/${thumbnailFile.name}`);
      
      if (publicUrl) {
        console.log(`[Launch API]       Found thumbnail file for ${videoName}: ${publicUrl}`);
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
    
    // Validate image size and type
    if (imageBlob.size === 0) {
      return { error: 'Image file is empty' };
    }
    
    if (imageBlob.size > 30 * 1024 * 1024) { // 30MB limit for images
      return { error: 'Image file too large (>30MB)' };
    }
    
    // Ensure it's a valid image type
    const contentType = imageBlob.type;
    if (!contentType || !['image/jpeg', 'image/jpg', 'image/png'].includes(contentType)) {
      console.warn(`[Launch API]       Unexpected image type: ${contentType}, using image/jpeg`);
    }
    
    console.log(`[Launch API]       Image details: size=${(imageBlob.size / 1024).toFixed(2)}KB, type=${contentType}`);
    
    // Upload to Meta
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
    
    const formData = new FormData();
    formData.append('access_token', accessToken);
    
    // Use a clean filename for Meta
    const cleanImageName = imageName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${cleanImageName}_thumbnail.jpg`;
    
    formData.append('source', imageBlob, filename);

    const metaUploadUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${formattedAdAccountId}/adimages`;
    
    console.log(`[Launch API]       Uploading thumbnail to Meta for ${imageName} (${filename})...`);
    const metaResponse = await fetch(metaUploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error(`[Launch API]       Meta thumbnail upload failed:`, {
        status: metaResponse.status,
        statusText: metaResponse.statusText,
        error: errorText,
        filename
      });
      return { error: `Thumbnail upload failed: ${metaResponse.status} ${metaResponse.statusText} - ${errorText}` };
    }

    const result = await metaResponse.json();
    
    if (result.error) {
      console.error(`[Launch API]       Meta thumbnail upload error:`, result.error);
      return { error: `Thumbnail upload error: ${result.error.message}` };
    }

    // Extract image hash from response
    const imageHash = result.images?.[filename]?.hash || result.images?.[Object.keys(result.images)[0]]?.hash;
    
    if (!imageHash) {
      console.error(`[Launch API]       No image hash in Meta response:`, result);
      return { error: 'No image hash returned from Meta thumbnail upload' };
    }

    console.log(`[Launch API]       Thumbnail uploaded successfully to Meta. Hash: ${imageHash}, Filename: ${filename}`);
    return { imageHash };
    
  } catch (error) {
    console.error(`[Launch API]       Thumbnail upload exception:`, error);
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
          // Ensure adAccountId has the proper format (remove extra 'act_' if it exists)
          const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId.substring(4) : adAccountId;
          
          if (asset.type === 'image') {
            // For images, we need to fetch and upload directly as Meta doesn't support image URL upload
            const assetResponse = await fetch(asset.supabaseUrl);
            console.log(`[Launch API]     Fetched asset from Supabase: status=${assetResponse.status}, contentType=${assetResponse.headers.get('content-type')}, contentLength=${assetResponse.headers.get('content-length')}`);
            
            if (!assetResponse.ok) {
              throw new Error(`Failed to fetch asset ${asset.name} from Supabase: ${assetResponse.statusText}`);
            }
            const assetBlob = await assetResponse.blob();
            console.log(`[Launch API]     Created blob: size=${assetBlob.size}, type=${assetBlob.type}`);
            
            // Validate the blob
            if (assetBlob.size === 0) {
              throw new Error(`Asset ${asset.name} is empty (0 bytes)`);
            }

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
            console.log(`[Launch API]     Processing video: ${asset.name}`);
            
            // Check for aspect ratio in filename and validate
            const detectedAspectRatio = detectAspectRatioFromFilename(asset.name);
            const validation = validateVideoForAspectRatio(asset.name, detectedAspectRatio);
            
            if (!validation.isValid) {
              console.warn(`[Launch API]     Video aspect ratio validation failed for ${asset.name}:`);
              validation.suggestions.forEach(suggestion => {
                console.warn(`[Launch API]       - ${suggestion}`);
              });
            }
            
            // Try URL upload first (more efficient - no need to download entire file)
            console.log(`[Launch API]     Attempting URL upload for video: ${asset.name}`);
            const urlUploadResult = await uploadVideoUsingFileUrl(
              asset.supabaseUrl, 
              asset.name, 
              adAccountId, 
              accessToken
            );
            
            if (!urlUploadResult.error && urlUploadResult.videoId) {
              console.log(`[Launch API]     URL upload succeeded for ${asset.name}. ID: ${urlUploadResult.videoId}`);
              updatedAssets.push({ ...asset, metaVideoId: urlUploadResult.videoId });
              continue;
            }
            
            // URL upload failed, fall back to resumable upload
            console.warn(`[Launch API]     URL upload failed for ${asset.name}: ${urlUploadResult.error}`);
            console.log(`[Launch API]     Falling back to resumable upload (downloading file first)...`);
            
            // Now fetch the file for resumable upload
            const assetResponse = await fetch(asset.supabaseUrl);
            console.log(`[Launch API]     Fetched asset from Supabase: status=${assetResponse.status}, contentType=${assetResponse.headers.get('content-type')}, contentLength=${assetResponse.headers.get('content-length')}`);
            
            if (!assetResponse.ok) {
              throw new Error(`Failed to fetch asset ${asset.name} from Supabase: ${assetResponse.statusText}`);
            }
            const assetBlob = await assetResponse.blob();
            console.log(`[Launch API]     Created blob: size=${assetBlob.size}, type=${assetBlob.type}`);
            
            // Validate the blob
            if (assetBlob.size === 0) {
              throw new Error(`Asset ${asset.name} is empty (0 bytes)`);
            }
            
            // Check file size (Meta recommends up to 10GB)
            const videoSizeMB = assetBlob.size / (1024 * 1024);
            if (videoSizeMB > 10240) { // 10GB in MB
              console.error(`[Launch API]     Video ${asset.name} exceeds 10GB limit: ${videoSizeMB.toFixed(2)}MB`);
              updatedAssets.push({ ...asset, metaUploadError: `Video too large: ${videoSizeMB.toFixed(2)}MB (limit: 10GB)` });
              continue;
            }
            
            // Check MIME type
            const expectedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/mpeg'];
            if (assetBlob.type && !expectedVideoTypes.includes(assetBlob.type)) {
              console.warn(`[Launch API]     Unexpected video MIME type: ${assetBlob.type}. Expected one of: ${expectedVideoTypes.join(', ')}`);
            }
            
            // Try to detect video dimensions from filename or metadata
            const dimensionMatch = asset.name.match(/(\d{3,4})x(\d{3,4})/);
            if (dimensionMatch) {
              const width = parseInt(dimensionMatch[1]);
              const height = parseInt(dimensionMatch[2]);
              console.log(`[Launch API]     Detected video dimensions from filename: ${width}x${height}`);
              
              // Meta requires minimum width of 1200px for video ads
              if (width < 1200 && height < 1200) {
                console.error(`[Launch API]     Video ${asset.name} resolution too low: ${width}x${height}. Meta requires minimum width of 1200px.`);
                updatedAssets.push({ 
                  ...asset, 
                  metaUploadError: `Video resolution too low: ${width}x${height}. Minimum width required: 1200px. Please re-export at higher resolution.` 
                });
                continue;
              }
            } else {
              console.warn(`[Launch API]     Could not detect video dimensions from filename. Meta requires minimum width of 1200px.`);
              if (detectedAspectRatio) {
                console.warn(`[Launch API]     Consider adding dimensions to filename (e.g., ${asset.name.replace('.mp4', '_1200x1920.mp4')})`);
              }
            }
            
            // Use resumable upload as fallback
            const { videoId, error } = await uploadVideoUsingResumableAPI(assetBlob, asset.name, adAccountId, accessToken);
            
            if (error) {
              console.error(`[Launch API]     Both upload methods failed for ${asset.name}`);
              console.error(`[Launch API]     - URL upload error: ${urlUploadResult.error}`);
              console.error(`[Launch API]     - Resumable upload error: ${error}`);
              updatedAssets.push({ ...asset, metaUploadError: `All upload methods failed. URL: ${urlUploadResult.error}. Resumable: ${error}` });
              continue;
            }

            if (!videoId) {
              console.error('[Launch API]     Video upload succeeded but no video ID returned for:', asset.name);
              updatedAssets.push({ ...asset, metaUploadError: 'Video ID not found in Meta response' });
              continue;
            }

            console.log(`[Launch API]     Video ${asset.name} uploaded using Resumable API (fallback). ID: ${videoId}`);
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
        const detectedRatio = detectAspectRatioFromFilename(asset.name);
        const ratiosToCheck = aspectRatios.length > 0 ? aspectRatios : (detectedRatio ? [detectedRatio] : []);
        
        console.log(`[Launch API]         - ${asset.name}: Using ratios ${JSON.stringify(ratiosToCheck)} (detected: ${detectedRatio})`);
        
        // If no aspect ratio can be determined, include it as a feed asset by default
        if (ratiosToCheck.length === 0) {
          console.log(`[Launch API]         - ${asset.name}: No aspect ratio found, including as feed asset`);
          return true;
        }
        
        // Only include 4x5 aspect ratio assets for specific feed placements:
        // Facebook feed, Facebook video feeds, Instagram explore, Facebook marketplace,
        // Instagram profile feed, Facebook profile feed, Facebook in stream videos
        return ratiosToCheck.some(ratio => ['4:5', '4x5', '1:1', '1x1'].includes(ratio));
      });
      
      const storyAssets = (draft.assets as ProcessedAdDraftAsset[]).filter((asset: ProcessedAdDraftAsset) => {
        if (!(asset.metaHash || asset.metaVideoId) || asset.metaUploadError) return false;
        
        // Use existing aspect ratios or detect from filename as fallback
        const aspectRatios = asset.aspectRatios || [];
        const detectedRatio = detectAspectRatioFromFilename(asset.name);
        const ratiosToCheck = aspectRatios.length > 0 ? aspectRatios : (detectedRatio ? [detectedRatio] : []);
        
        // Only include 9x16 aspect ratio assets for story/reels placements
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

      // Process thumbnails for ALL video assets (both feed and story) before creating creatives
      const videoThumbnailCache: Record<string, string> = {}; // videoId -> imageHash
      
      console.log(`[Launch API]     Processing thumbnails for video assets...`);
      const allVideoAssets = [...feedAssets, ...storyAssets].filter(asset => 
        asset.type === 'video' && asset.metaVideoId && !asset.metaUploadError
      );
      
      for (const videoAsset of allVideoAssets) {
        try {
          // Find the original asset in the draft to get concept ID for thumbnail search
          const originalAsset = (draft.assets as ProcessedAdDraftAsset[]).find(
            a => a.metaVideoId === videoAsset.metaVideoId
          );
          
          if (originalAsset) {
            console.log(`[Launch API]       Processing thumbnail for video: ${originalAsset.name} (${videoAsset.aspectRatios?.join(', ') || 'unknown aspect ratio'})`);
            
            // Try to find a pre-uploaded thumbnail
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
                console.warn(`[Launch API]       Could not upload thumbnail for ${originalAsset.name}: ${uploadResult.error}`);
              } else {
                videoThumbnailCache[videoAsset.metaVideoId!] = uploadResult.imageHash!;
                console.log(`[Launch API]       Thumbnail processed for video: ${originalAsset.name} -> Hash: ${uploadResult.imageHash}`);
              }
            } else {
              console.warn(`[Launch API]       No thumbnail found for ${originalAsset.name}: ${thumbnailResult.error}`);
            }
          }
        } catch (thumbnailError) {
          console.warn(`[Launch API]       Could not process thumbnail for video ${videoAsset.metaVideoId}:`, thumbnailError);
        }
      }
      
      console.log(`[Launch API]     Thumbnail processing complete. ${Object.keys(videoThumbnailCache).length} thumbnails ready for use.`);

      // If we have assets for different placements, use placement asset customization
      if (feedAssets.length > 0 && storyAssets.length > 0) {
        console.log(`[Launch API]     Multiple aspect ratios detected with videos - using simplified approach`);
        
        // For videos uploaded via video_ads endpoint, use simpler object_story_spec approach
        // instead of asset_feed_spec to avoid compatibility issues
        const hasVideos = [...feedAssets, ...storyAssets].some(asset => asset.type === 'video');
        
        if (hasVideos) {
          console.log(`[Launch API]     Videos detected - using asset_feed_spec for proper placement targeting`);
          
          // Add feed videos with placement targeting for Facebook Feed
          feedAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
            const assetLabel = `feed_asset_${index}`;
            if (asset.type === 'video' && asset.metaVideoId) {
              // Use pre-processed thumbnail from cache
              const thumbnailHash = videoThumbnailCache[asset.metaVideoId];
              
                                           creativeSpec.asset_feed_spec.videos.push({
                video_id: asset.metaVideoId,
                adlabels: [{ name: assetLabel }],
                ...(thumbnailHash && { thumbnail_hash: thumbnailHash })
              });
               if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_VIDEO')) {
                 creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
               }
                         } else if (asset.type === 'image' && asset.metaHash) {
               creativeSpec.asset_feed_spec.images.push({
                 hash: asset.metaHash,
                 adlabels: [{ name: assetLabel }]
               });
               if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_IMAGE')) {
                 creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_IMAGE');
               }
            }

            // Add customization rule for feed placements - CRITICAL for 4x5 videos to show in Facebook Feed!
            creativeSpec.asset_feed_spec.asset_customization_rules.push({
              customization_spec: {
                publisher_platforms: ['facebook', 'instagram'],
                facebook_positions: ['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video'],
                instagram_positions: ['stream', 'explore']
              },
              [asset.type === 'video' ? 'video_label' : 'image_label']: { name: assetLabel }
            });
          });

          // Add story videos with placement targeting
          storyAssets.forEach((asset: ProcessedAdDraftAsset, index: number) => {
            const assetLabel = `story_asset_${index}`;
            if (asset.type === 'video' && asset.metaVideoId) {
              // Use pre-processed thumbnail from cache
              const thumbnailHash = videoThumbnailCache[asset.metaVideoId];
              
              creativeSpec.asset_feed_spec.videos.push({
                video_id: asset.metaVideoId,
                adlabels: [{ name: assetLabel }],
                ...(thumbnailHash && { thumbnail_hash: thumbnailHash })
              });
              if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_VIDEO')) {
                creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
              }
            } else if (asset.type === 'image' && asset.metaHash) {
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
              [asset.type === 'video' ? 'video_label' : 'image_label']: { name: assetLabel }
            });
          });
          
          console.log(`[Launch API]     Added ${feedAssets.length} feed assets and ${storyAssets.length} story assets with explicit placement targeting for videos`);
          
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
                facebook_positions: ['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video'],
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
        const totalAssets = feedAssets.length + storyAssets.length;
        const hasSingleVideoAsset = totalAssets === 1 && 
          ([...feedAssets, ...storyAssets].some(asset => asset.type === 'video'));
        
        if (hasSingleVideoAsset) {
          // For single video assets, check if it's a feed asset (4x5) that needs placement targeting
          if (feedAssets.length > 0) {
            console.log(`[Launch API]     Single 4x5 video asset - using asset_feed_spec for placement targeting`);
            const feedAsset = feedAssets[0];
            const assetLabel = 'single_feed_video';
            
            if (feedAsset.type === 'video' && feedAsset.metaVideoId) {
              const thumbnailHash = videoThumbnailCache[feedAsset.metaVideoId];
              
              creativeSpec.asset_feed_spec.videos.push({
                video_id: feedAsset.metaVideoId,
                adlabels: [{ name: assetLabel }],
                ...(thumbnailHash && { thumbnail_hash: thumbnailHash })
              });
              if (!creativeSpec.asset_feed_spec.ad_formats.includes('SINGLE_VIDEO')) {
                creativeSpec.asset_feed_spec.ad_formats.push('SINGLE_VIDEO');
              }
              
              // CRITICAL: Add placement targeting for 4x5 videos to ensure Facebook Feed placement
              creativeSpec.asset_feed_spec.asset_customization_rules.push({
                customization_spec: {
                  publisher_platforms: ['facebook', 'instagram'],
                  facebook_positions: ['feed', 'video_feeds', 'marketplace', 'profile_feed', 'instream_video'],
                  instagram_positions: ['stream', 'explore']
                },
                video_label: { name: assetLabel }
              });
              
              console.log(`[Launch API]     Single 4x5 video configured for Facebook Feed placement: ${feedAsset.name}`);
            }
          } else if (storyAssets.length > 0) {
            // For single story assets (9x16), use the simpler object_story_spec approach
            // to avoid asset_customization_rules compatibility issues
            console.log(`[Launch API]     Single 9x16 video asset - using object_story_spec approach`);
            const storyAsset = storyAssets[0];
            
            if (storyAsset.type === 'video' && storyAsset.metaVideoId) {
              const thumbnailHash = videoThumbnailCache[storyAsset.metaVideoId];
              
              if (thumbnailHash) {
                console.log(`[Launch API]     Using cached thumbnail for story video: ${storyAsset.name}`);
              } else {
                console.warn(`[Launch API]     No thumbnail available for story video: ${storyAsset.name}`);
              }
              
              creativeSpec.object_story_spec.video_data = {
                video_id: storyAsset.metaVideoId,
                message: draft.primaryText,
                call_to_action: {
                  type: draft.callToAction?.toUpperCase().replace(/\s+/g, '_'),
                  value: { link: draft.destinationUrl },
                },
                title: draft.headline,
                ...(thumbnailHash && { image_hash: thumbnailHash })
              };
              
              // Remove asset_feed_spec for single story video to avoid compatibility issues
              delete creativeSpec.asset_feed_spec;
              
              console.log(`[Launch API]     Single 9x16 video configured for story placement: ${storyAsset.name}`);
            }
          }
        } else {
          // For single images or mixed single assets, use traditional object_story_spec
          const availableAssets = storyAssets.length > 0 ? storyAssets : feedAssets;
          const selectedAsset = availableAssets[0];
          
          console.log(`[Launch API]     Using single asset approach with: ${selectedAsset.name}`);
          
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
            // Use pre-processed thumbnail from cache
            const thumbnailHash = videoThumbnailCache[selectedAsset.metaVideoId];
            
            if (thumbnailHash) {
              console.log(`[Launch API]     Using cached thumbnail for selected video: ${selectedAsset.name}`);
            } else {
              console.warn(`[Launch API]     No thumbnail available for selected video: ${selectedAsset.name}`);
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
          
          // Remove asset_feed_spec for traditional single asset approach
          delete creativeSpec.asset_feed_spec;
        }
      } else {
        throw new Error('No valid assets found for creative creation');
      }

      // Check if any videos need to be ready before creating the ad
      const videoIds = (draft.assets as ProcessedAdDraftAsset[])
        .filter(asset => asset.type === 'video' && asset.metaVideoId && !asset.metaUploadError)
        .map(asset => asset.metaVideoId!);

      if (videoIds.length > 0) {
        console.log(`[Launch API]     Found ${videoIds.length} videos uploaded via video_ads endpoint`);
        console.log(`[Launch API]     Checking video processing status...`);
        
        // Wait for videos to be ready with a 5-minute timeout
        const { allReady, notReadyVideos, erroredVideos } = await waitForVideosToBeReady(
          videoIds, 
          accessToken, 
          300000 // 5 minutes
        );
        
        if (!allReady) {
          if (erroredVideos.length > 0) {
            throw new Error(`${erroredVideos.length} video(s) failed processing: ${erroredVideos.join(', ')}`);
          } else if (notReadyVideos.length > 0) {
            throw new Error(`${notReadyVideos.length} video(s) still processing after timeout: ${notReadyVideos.join(', ')}`);
          }
        }
        
        console.log(`[Launch API]     All videos are ready for ad use`);
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