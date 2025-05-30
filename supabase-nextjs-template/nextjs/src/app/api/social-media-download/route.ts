import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeFacebook, scrapeInstagram, scrapeTikTok } from '@/lib/social-media-scrapers';

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
  alreadyExists?: boolean; // Flag to indicate if content already existed
}

interface SaveToSupabaseRequest {
  brandId: string;
  userId: string;
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
  // First check the URL for file extensions
  const urlLower = url.toLowerCase();
  
  // Check for image extensions in URL
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
  if (urlLower.includes('.png')) return 'png';
  if (urlLower.includes('.gif')) return 'gif';
  if (urlLower.includes('.webp')) return 'webp';
  
  // Check for video extensions in URL
  if (urlLower.includes('.mp4')) return 'mp4';
  if (urlLower.includes('.webm')) return 'webm';
  if (urlLower.includes('.mov')) return 'mov';
  
  // If no extension in URL, use content type
  if (contentType === 'image') {
    return 'jpg'; // Default for images
  } else {
    return 'mp4'; // Default for videos
  }
}

// Helper function to detect content type from URL
function detectContentType(url: string): 'image' | 'video' {
  const urlLower = url.toLowerCase();
  
  // Check for image indicators in URL
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
      urlLower.includes('.png') || urlLower.includes('.gif') || 
      urlLower.includes('.webp') || urlLower.includes('image') ||
      urlLower.includes('photo')) {
    return 'image';
  }
  
  // Check for video indicators in URL
  if (urlLower.includes('.mp4') || urlLower.includes('.webm') || 
      urlLower.includes('.mov') || urlLower.includes('video') ||
      urlLower.includes('watch') || urlLower.includes('reel')) {
    return 'video';
  }
  
  // Default based on platform
  if (urlLower.includes('instagram.com')) {
    // Instagram posts can be either, but default to image
    return 'image';
  }
  
  // Facebook and TikTok default to video
  return 'video';
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
    const result = await scrapeFacebook(url);
    
    console.log('Facebook scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      // Detect content type from the download URL
      const detectedType = detectContentType(result.data.url);
      
      return {
        url,
        type: detectedType,
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
    const result = await scrapeInstagram(url);
    
    console.log('Instagram scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      // Detect content type from the download URL
      const detectedType = detectContentType(result.data.url);
      
      return {
        url,
        type: detectedType,
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
    const result = await scrapeTikTok(url);
    
    console.log('TikTok scraper result:', result);
    
    if (result && result.status === 200 && result.data && result.data.url) {
      // TikTok is always video
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

async function saveToSupabase(result: DownloadResult, brandId: string, userId: string): Promise<{ id: string | null; alreadyExists: boolean }> {
  if (result.status !== 'success' || !result.downloadUrl) {
    return { id: null, alreadyExists: false };
  }

  try {
    // First check if this URL already exists for this brand
    const { data: existingContent, error: checkError } = await supabase
      .from('social_media_content')
      .select('id, file_url')
      .eq('brand_id', brandId)
      .eq('source_url', result.url)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing content:', checkError);
      throw new Error(`Database check failed: ${checkError.message}`);
    }

    // If content already exists, return the existing ID
    if (existingContent) {
      console.log(`Content already exists for URL: ${result.url}, returning existing ID: ${existingContent.id}`);
      return { id: existingContent.id, alreadyExists: true };
    }

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
        folder_name: null,
        download_count: 0,
        source_type: 'manual'
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
    console.log('Saved data:', {
      id: dbData.id,
      brand_id: brandId,
      user_id: userId,
      source_url: result.url,
      platform: detectPlatform(result.url),
      title: result.title,
      content_type: result.type,
      file_name: filename
    });
    return { id: dbData.id, alreadyExists: false };

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
      const { brandId, userId, urls }: SaveToSupabaseRequest = body;
      
      if (!brandId) {
        return NextResponse.json({
          error: 'Brand ID is required for saving to Supabase'
        }, { status: 400 });
      }

      if (!userId) {
        return NextResponse.json({
          error: 'User ID is required for saving to Supabase'
        }, { status: 400 });
      }

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({
          error: 'Please provide an array of URLs'
        }, { status: 400 });
      }

      const results: DownloadResult[] = [];
      
      for (const url of urls) {
        const result = await downloadFromPlatform(url);
        
        if (result.status === 'success') {
          try {
            const { id, alreadyExists } = await saveToSupabase(result, brandId, userId);
            result.contentId = id || undefined;
            result.alreadyExists = alreadyExists;
          } catch (saveError) {
            result.status = 'error';
            result.error = `Save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
          }
        }
        
        results.push(result);
      }

      const newCount = results.filter(r => r.status === 'success' && !r.alreadyExists).length;
      const existingCount = results.filter(r => r.status === 'success' && r.alreadyExists).length;
      
      let message = `Processed ${urls.length} URLs using custom scraper.`;
      if (newCount > 0) {
        message += ` ${newCount} new items saved to brand board.`;
      }
      if (existingCount > 0) {
        message += ` ${existingCount} items already existed in brand board.`;
      }
      
      return NextResponse.json({
        success: true,
        results,
        message
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
        message: `Processed ${urls.length} URLs using custom scraper. ${successCount} successful.`
      });
    }
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 