import { createSPAClient } from '@/lib/supabase/client';

export interface ThumbnailGenerationResult {
  success: boolean;
  processed: number;
  total: number;
  errors: Array<{ assetId: string; assetName: string; error: string }>;
}

export interface VideoAsset {
  id: string;
  name: string;
  supabase_url: string;
  type: string;
  ad_draft_id: string;
}

/**
 * Automatically generates thumbnails for video assets
 * @param videoAssets Array of video assets to generate thumbnails for
 * @param onProgress Callback to report progress (assetId, progress percentage)
 * @returns Promise with generation results
 */
export async function generateThumbnailsAutomatically(
  videoAssets: VideoAsset[],
  onProgress?: (assetId: string, progress: number) => void
): Promise<ThumbnailGenerationResult> {
  
  if (videoAssets.length === 0) {
    return {
      success: true,
      processed: 0,
      total: 0,
      errors: []
    };
  }

  console.log(`[AutoThumbnail] Starting automatic thumbnail generation for ${videoAssets.length} video assets`);
  
  const supabase = createSPAClient();
  let processed = 0;
  const errors: Array<{ assetId: string; assetName: string; error: string }> = [];

  for (const asset of videoAssets) {
    try {
      if (onProgress) onProgress(asset.id, 0);
      
      // Extract thumbnail from video
      const { thumbnailBlob, error } = await extractVideoThumbnailFromUrl(asset.supabase_url);
      
      if (onProgress) onProgress(asset.id, 50);
      
      if (error || !thumbnailBlob || thumbnailBlob.size === 0) {
        console.warn(`[AutoThumbnail] Could not extract thumbnail for ${asset.name}: ${error}`);
        errors.push({
          assetId: asset.id,
          assetName: asset.name,
          error: error || 'Failed to extract thumbnail'
        });
        if (onProgress) onProgress(asset.id, -1); // Error state
        continue;
      }
      
      // Upload thumbnail to Supabase
      const timestamp = Date.now();
      const thumbnailFileName = `${asset.name.split('.')[0]}_thumbnail.jpg`;
      const thumbnailPath = `${asset.ad_draft_id}/${timestamp}_${thumbnailFileName}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('ad-creatives')
        .upload(thumbnailPath, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError || !data) {
        console.error(`[AutoThumbnail] Upload failed for ${asset.name}:`, uploadError);
        errors.push({
          assetId: asset.id,
          assetName: asset.name,
          error: uploadError?.message || 'Upload failed'
        });
        if (onProgress) onProgress(asset.id, -1); // Error state
        continue;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(thumbnailPath);
      
      if (publicUrl) {
        // Update the database with the thumbnail URL
        const { error: updateError } = await supabase
          .from('ad_draft_assets')
          .update({ thumbnail_url: publicUrl })
          .eq('id', asset.id);
        
        if (updateError) {
          console.error(`[AutoThumbnail] Failed to update thumbnail URL in database for ${asset.name}:`, updateError);
          errors.push({
            assetId: asset.id,
            assetName: asset.name,
            error: `Database update failed: ${updateError.message}`
          });
          if (onProgress) onProgress(asset.id, -1); // Error state
          continue;
        }
        
        console.log(`[AutoThumbnail] Thumbnail generated and saved for ${asset.name}: ${publicUrl}`);
        if (onProgress) onProgress(asset.id, 100);
        processed++;
      }
      
    } catch (error) {
      console.error(`[AutoThumbnail] Error processing ${asset.name}:`, error);
      errors.push({
        assetId: asset.id,
        assetName: asset.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (onProgress) onProgress(asset.id, -1); // Error state
    }
  }
  
  console.log(`[AutoThumbnail] Automatic thumbnail generation complete. Processed ${processed} of ${videoAssets.length} videos.`);
  
  return {
    success: processed > 0 || videoAssets.length === 0,
    processed,
    total: videoAssets.length,
    errors
  };
}

/**
 * Extract first frame from video URL as thumbnail
 */
async function extractVideoThumbnailFromUrl(videoUrl: string): Promise<{ thumbnailBlob: Blob; error?: string }> {
  return new Promise(async (resolve) => {
    try {
      // Fetch the video first
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        resolve({ thumbnailBlob: new Blob(), error: `Failed to fetch video: ${videoResponse.statusText}` });
        return;
      }
      
      const videoBlob = await videoResponse.blob();
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      
      // Create video element to extract frame
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ thumbnailBlob: new Blob(), error: 'Could not create canvas context' });
        return;
      }
      
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      video.addEventListener('loadedmetadata', () => {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Seek to first frame
        video.currentTime = 0;
      });
      
      video.addEventListener('seeked', () => {
        try {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ thumbnailBlob: blob });
            } else {
              resolve({ thumbnailBlob: new Blob(), error: 'Could not extract frame from video' });
            }
            
            // Clean up
            URL.revokeObjectURL(videoObjectUrl);
            video.remove();
            canvas.remove();
          }, 'image/jpeg', 0.8);
          
        } catch (error) {
          resolve({ thumbnailBlob: new Blob(), error: `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
          
          // Clean up
          URL.revokeObjectURL(videoObjectUrl);
          video.remove();
          canvas.remove();
        }
      });
      
      video.addEventListener('error', () => {
        resolve({ thumbnailBlob: new Blob(), error: 'Could not load video for thumbnail extraction' });
        
        // Clean up
        URL.revokeObjectURL(videoObjectUrl);
        video.remove();
        canvas.remove();
      });
      
      video.src = videoObjectUrl;
      video.load();
      
    } catch (error) {
      resolve({ thumbnailBlob: new Blob(), error: `Thumbnail extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
}

/**
 * Automatically generate thumbnails for video assets in an ad draft
 * @param draftId The ID of the ad draft
 * @param onProgress Optional progress callback
 * @returns Promise with generation results
 */
export async function generateThumbnailsForDraft(
  draftId: string,
  onProgress?: (assetId: string, progress: number) => void
): Promise<ThumbnailGenerationResult> {
  
  try {
    const supabase = createSPAClient();
    
    // Fetch video assets for the draft
    const { data: assets, error } = await supabase
      .from('ad_draft_assets')
      .select('*')
      .eq('ad_draft_id', draftId)
      .eq('type', 'video');
    
    if (error) {
      console.error(`[AutoThumbnail] Failed to fetch assets for draft ${draftId}:`, error);
      return {
        success: false,
        processed: 0,
        total: 0,
        errors: [{ assetId: '', assetName: '', error: error.message }]
      };
    }
    
    const videoAssets: VideoAsset[] = (assets || []).map(asset => ({
      id: asset.id,
      name: asset.name,
      supabase_url: asset.supabase_url,
      type: asset.type,
      ad_draft_id: asset.ad_draft_id
    }));
    
    return await generateThumbnailsAutomatically(videoAssets, onProgress);
    
  } catch (error) {
    console.error(`[AutoThumbnail] Error in generateThumbnailsForDraft:`, error);
    return {
      success: false,
      processed: 0,
      total: 0,
      errors: [{ assetId: '', assetName: '', error: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}

/**
 * Generate thumbnails for video assets from uploaded asset groups
 * @param assetGroups Array of uploaded asset groups containing video assets
 * @param draftId The ID of the ad draft (for thumbnail path)
 * @param onProgress Optional progress callback
 * @returns Promise with generation results
 */
export async function generateThumbnailsForAssetGroups(
  assetGroups: Array<{ baseName: string; assets: Array<{ id: string; name: string; supabaseUrl: string; type: string }> }>,
  draftId: string,
  onProgress?: (assetId: string, progress: number) => void
): Promise<ThumbnailGenerationResult> {
  
  // Extract video assets from all groups
  const videoAssets: VideoAsset[] = [];
  
  assetGroups.forEach(group => {
    group.assets.forEach(asset => {
      if (asset.type === 'video') {
        videoAssets.push({
          id: asset.id,
          name: asset.name,
          supabase_url: asset.supabaseUrl,
          type: asset.type,
          ad_draft_id: draftId
        });
      }
    });
  });
  
  return await generateThumbnailsAutomatically(videoAssets, onProgress);
} 