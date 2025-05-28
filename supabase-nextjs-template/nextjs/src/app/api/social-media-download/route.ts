import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DownloadResult {
  url: string;
  type: 'image' | 'video';
  status: 'success' | 'error';
  downloadUrl?: string;
  thumbnail?: string;
  title?: string;
  error?: string;
  filename?: string;
  filesize?: number;
  contentId?: string; // Supabase record ID
}

interface SaveToSupabaseRequest {
  brandId: string;
  urls: string[];
}

// Helper function to detect platform from URL
function detectPlatform(url: string): string {
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'unknown';
}

// Helper function to get proper file extension based on content type
function getFileExtension(contentType: string, url: string): string {
  // First check the content type
  if (contentType === 'image') {
    // For images, check URL or default to jpg
    if (url.includes('.png')) return 'png';
    if (url.includes('.gif')) return 'gif';
    if (url.includes('.webp')) return 'webp';
    return 'jpg'; // Default for images
  } else {
    // For videos, default to mp4
    if (url.includes('.webm')) return 'webm';
    if (url.includes('.mov')) return 'mov';
    return 'mp4'; // Default for videos
  }
}

// Helper function to get MIME type
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

async function downloadFromFacebook(url: string): Promise<DownloadResult> {
  try {
    const { facebook } = await import('@/lib/scraper-wrapper.mjs');
    const result = await facebook(url);
    
    console.log('Facebook scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      return {
        url,
        type: result.data.type || 'video',
        status: 'success',
        downloadUrl: result.data.url,
        title: result.data.title || 'Facebook Content',
        thumbnail: result.data.thumbnail
      };
    }
    
    throw new Error(result?.msg || 'No download URL found');
  } catch (error) {
    console.error('Facebook download error:', error);
    return {
      url,
      type: 'video',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function downloadFromInstagram(url: string): Promise<DownloadResult> {
  try {
    const { instagram } = await import('@/lib/scraper-wrapper.mjs');
    const result = await instagram(url);
    
    console.log('Instagram scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      return {
        url,
        type: result.data.type || 'image',
        status: 'success',
        downloadUrl: result.data.url,
        title: result.data.title || 'Instagram Content',
        thumbnail: result.data.thumbnail
      };
    }
    
    throw new Error(result?.msg || 'No download URL found');
  } catch (error) {
    console.error('Instagram download error:', error);
    return {
      url,
      type: 'image',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function downloadFromTikTok(url: string): Promise<DownloadResult> {
  try {
    const { tiktok } = await import('@/lib/scraper-wrapper.mjs');
    const result = await tiktok(url);
    
    console.log('TikTok scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      return {
        url,
        type: 'video',
        status: 'success',
        downloadUrl: result.data.url,
        title: result.data.title || 'TikTok Video',
        thumbnail: result.data.thumbnail
      };
    }
    
    throw new Error(result?.msg || 'No download URL found');
  } catch (error) {
    console.error('TikTok download error:', error);
    return {
      url,
      type: 'video',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function downloadFromPlatform(url: string): Promise<DownloadResult> {
  const platform = detectPlatform(url);
  
  console.log(`Processing ${platform} URL: ${url}`);
  
  switch (platform) {
    case 'facebook':
      return await downloadFromFacebook(url);
    case 'instagram':
      return await downloadFromInstagram(url);
    case 'tiktok':
      return await downloadFromTikTok(url);
    default:
      return {
        url,
        type: 'video',
        status: 'error',
        error: `Unsupported platform: ${platform}`
      };
  }
}

async function saveToSupabase(result: DownloadResult, brandId: string, userId: string): Promise<string | null> {
  if (result.status !== 'success' || !result.downloadUrl) {
    return null;
  }

  try {
    // Download the file
    const response = await fetch(result.downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get proper file extension and MIME type
    const extension = getFileExtension(result.type, result.downloadUrl);
    const mimeType = getMimeType(extension);
    
    // Create filename
    const timestamp = Date.now();
    const platform = detectPlatform(result.url);
    const filename = `${platform}_${timestamp}.${extension}`;
    const filePath = `${userId}/${brandId}/${filename}`;

    console.log(`Uploading to Supabase: ${filePath} (${mimeType})`);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('social-media-content')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('social-media-content')
      .getPublicUrl(filePath);

    // Save metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from('social_media_content')
      .insert({
        brand_id: brandId,
        user_id: userId,
        source_url: result.url,
        platform: detectPlatform(result.url),
        title: result.title,
        content_type: result.type,
        file_url: publicUrl,
        file_name: filename,
        original_filename: filename,
        file_size: buffer.length,
        thumbnail_url: result.thumbnail,
        mime_type: mimeType,
        dimensions: null, // Could be extracted later
        tags: [],
        notes: null,
        is_favorite: false,
        folder_name: null
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('social-media-content').remove([filePath]);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    console.log(`Successfully saved to Supabase: ${dbData.id}`);
    return dbData.id;

  } catch (error) {
    console.error('Error saving to Supabase:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Social media download API called');
    
    const body = await request.json();
    
    // Check if this is a save-to-supabase request
    if ('brandId' in body) {
      const { brandId, urls }: SaveToSupabaseRequest = body;
      
      if (!brandId) {
        return NextResponse.json({
          error: 'Brand ID is required for saving to Supabase'
        }, { status: 400 });
      }

      // Get user ID from auth (you'll need to implement this based on your auth setup)
      // For now, using a placeholder - replace with actual auth
      const userId = 'user-placeholder'; // TODO: Get from auth

      const results: DownloadResult[] = [];
      
      for (const url of urls) {
        const result = await downloadFromPlatform(url);
        
        if (result.status === 'success') {
          try {
            const contentId = await saveToSupabase(result, brandId, userId);
            result.contentId = contentId || undefined;
          } catch (saveError) {
            result.status = 'error';
            result.error = `Save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
          }
        }
        
        results.push(result);
      }

      const successCount = results.filter(r => r.status === 'success').length;
      
      return NextResponse.json({
        success: true,
        results,
        message: `Processed ${urls.length} URLs using fongsi scraper. ${successCount} saved to brand board.`
      });
    } else {
      // Original download-only functionality
      const { urls } = body;
      
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({
          error: 'Please provide an array of URLs'
        }, { status: 400 });
      }

      const results: DownloadResult[] = [];
      
      for (const url of urls) {
        const result = await downloadFromPlatform(url);
        results.push(result);
      }

      const successCount = results.filter(r => r.status === 'success').length;
      
      return NextResponse.json({
        success: true,
        results,
        message: `Processed ${urls.length} URLs using fongsi scraper. ${successCount} successful.`
      });
    }
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 