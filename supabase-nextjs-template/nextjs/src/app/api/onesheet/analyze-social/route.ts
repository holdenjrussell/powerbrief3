import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { Database } from '@/lib/types/supabase';
import { scrapeFacebook, scrapeInstagram, scrapeTikTok } from '@/lib/social-media-scrapers';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SocialAnalysisRequest {
  url: string;
  sourceType: 'organic_social' | 'paid_social';
  brandId: string;
}

interface SocialAnalysisResult {
  url: string;
  title: string;
  platform: string;
  contentType: 'image' | 'video';
  
  // Basic metadata
  description?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
  
  // AI Analysis
  transcript?: string;
  structuralFlow?: string[];
  visualDescription?: string;
  numberOfSpeakers?: number;
  adFormat?: string;
  copywritingFramework?: string;
  visualHook?: string;
  audioHook?: string;
  emotionTargeted?: string[];
  productIntroTime?: number;
  
  // AdRipper integration
  adripperId?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  
  // OneSheet integration
  contextSourceType?: string;
  
  // Markdown analysis
  markdown?: string;
  timestamp: string;
}

// Detect platform from URL
function detectPlatform(url: string): string {
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('pinterest.com')) return 'pinterest';
  if (url.includes('snapchat.com')) return 'snapchat';
  return 'unknown';
}

// Determine content type from URL
function getContentType(url: string): 'image' | 'video' {
  // For now, assume TikTok and YouTube are videos, others could be either
  const platform = detectPlatform(url);
  if (platform === 'tiktok' || platform === 'youtube') return 'video';
  
  // For other platforms, we'll determine this during analysis
  return 'video'; // Default to video for comprehensive analysis
}

// Helper functions (from AdRipper)
function getFileExtension(contentType: string, url: string): string {
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

// Fix URL encoding issues common with social media scrapers
function cleanUrl(url: string): string {
  if (!url) return url;
  
  // Fix Unicode escape sequences
  let cleaned = url.replace(/u002f/gi, '/').replace(/u002F/gi, '/');
  
  // Fix other common encoding issues
  cleaned = cleaned.replace(/u003a/gi, ':').replace(/u003A/gi, ':');
  cleaned = cleaned.replace(/u003f/gi, '?').replace(/u003F/gi, '?');
  cleaned = cleaned.replace(/u0026/gi, '&').replace(/u0026/gi, '&');
  
  // Try to decode if it's a properly encoded URL
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (error) {
    // If decoding fails, use the cleaned version
    console.warn('[CleanUrl] Could not decode URL, using cleaned version:', error);
  }
  
  return cleaned;
}

// Save to AdRipper database WITH actual file storage (same as AdRipper)
async function saveToAdRipper(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  brandId: string,
  url: string,
  platform: string,
  contentType: 'image' | 'video',
  title: string,
  downloadUrl?: string,
  thumbnailUrl?: string,
  description?: string,
  duration?: number,
  dimensions?: { width: number; height: number }
): Promise<string | null> {
  try {
    console.log(`[AdRipper] Saving ${contentType} from ${platform} to storage and database`);
    
    // First check if this URL already exists for this brand
    const { data: existingContent, error: checkError } = await supabase
      .from('social_media_content')
      .select('id, file_url')
      .eq('brand_id', brandId)
      .eq('source_url', url)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing content:', checkError);
      throw new Error(`Database check failed: ${checkError.message}`);
    }

    // If content already exists, return the existing ID
    if (existingContent) {
      console.log(`[AdRipper] Content already exists for URL: ${url}, returning existing ID: ${existingContent.id}`);
      return existingContent.id;
    }

    let finalFileUrl = url; // Default to original URL
    let fileSize = 0;
    let filename = `${platform}_content_${Date.now()}`;

    // If we have a download URL, actually download and store the file (like AdRipper)
    if (downloadUrl && downloadUrl !== url) {
      try {
        // Fix URL encoding issues before downloading
        const cleanDownloadUrl = cleanUrl(downloadUrl);
        console.log(`[AdRipper] Downloading file from: ${cleanDownloadUrl}`);
        
        // Download the file
        const response = await fetch(cleanDownloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fileSize = buffer.length;
        
        // Get proper file extension and MIME type
        const extension = getFileExtension(contentType, downloadUrl);
        const mimeType = getMimeType(extension);
        
        // Create filename and path (same structure as AdRipper)
        const timestamp = Date.now();
        filename = `${platform}_${timestamp}.${extension}`;
        const filePath = `${userId}/${brandId}/${filename}`;

        console.log(`[AdRipper] Uploading to Supabase storage: ${filePath} (${mimeType})`);

        // Upload to Supabase storage (same bucket as AdRipper)
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

        finalFileUrl = publicUrl;
        console.log(`[AdRipper] File uploaded successfully: ${finalFileUrl}`);
        
      } catch (downloadError) {
        console.error(`[AdRipper] Failed to download and store file:`, downloadError);
        // Continue with original URL if download fails
        console.log(`[AdRipper] Falling back to original URL: ${url}`);
      }
    }

    // Save metadata to database (same structure as AdRipper)
    const { data, error } = await supabase
      .from('social_media_content')
      .insert({
        brand_id: brandId,
        user_id: userId,
        source_url: url,
        platform: platform,
        title: title || 'Untitled Post',
        content_type: contentType,
        file_url: finalFileUrl, // Use Supabase storage URL if downloaded, original URL otherwise
        file_name: filename,
        original_filename: filename,
        file_size: fileSize,
        thumbnail_url: thumbnailUrl,
        mime_type: getMimeType(getFileExtension(contentType, finalFileUrl)),
        dimensions: dimensions,
        tags: [platform, contentType],
        notes: description || 'Imported from OneSheet Context Hub',
        is_favorite: false,
        folder_name: null,
        download_count: 0,
        source_type: 'manual', // From manual OneSheet entry
        duration: duration,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving to AdRipper database:', error);
      
      // Clean up uploaded file if database insert fails (same as AdRipper)
      if (finalFileUrl !== url) {
        try {
          const filePath = `${userId}/${brandId}/${filename}`;
          await supabase.storage.from('social-media-content').remove([filePath]);
          console.log(`[AdRipper] Cleaned up uploaded file after database error`);
        } catch (cleanupError) {
          console.error(`[AdRipper] Failed to cleanup file:`, cleanupError);
        }
      }
      
      return null;
    }

    console.log(`[AdRipper] Successfully saved to database: ${data.id}`);
    return data?.id || null;
    
  } catch (error) {
    console.error('Error in saveToAdRipper:', error);
    return null;
  }
}

// Download video using AdRipper's proven social media scrapers
async function downloadVideoUsingAdRipper(url: string): Promise<{ filePath: string; mimeType: string; duration?: number; downloadUrl?: string; title?: string } | null> {
  try {
    const platform = detectPlatform(url);
    let scraperResult;
    
    console.log(`[VideoDownload] Using AdRipper logic for ${platform}: ${url}`);
    
    // Use the exact same scraper logic as AdRipper
    switch (platform) {
      case 'facebook':
        scraperResult = await scrapeFacebook(url);
        break;
      case 'instagram':
        scraperResult = await scrapeInstagram(url);
        break;
      case 'tiktok':
        scraperResult = await scrapeTikTok(url);
        break;
      default:
        // For YouTube and other platforms, fall back to yt-dlp
        return await downloadVideoWithYtDlp(url);
    }
    
    if (!scraperResult || scraperResult.status !== 200 || !scraperResult.data?.url) {
      console.error('[VideoDownload] Scraper failed:', scraperResult?.msg || 'No download URL found');
      return null;
    }
    
    let downloadUrl = scraperResult.data.url;
    const title = scraperResult.data.title;
    
    // Fix URL encoding issues - decode Unicode escape sequences
    downloadUrl = cleanUrl(downloadUrl);
    
    console.log('[VideoDownload] Got download URL from scraper:', downloadUrl);
    
    // Download the file from the extracted URL
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save to temp file
    const tempDir = '/tmp';
    const extension = scraperResult.data.type === 'video' ? 'mp4' : 'jpg';
    const fileName = `social_${platform}_${Date.now()}.${extension}`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, buffer);
    
    const mimeType = scraperResult.data.type === 'video' ? 'video/mp4' : 'image/jpeg';
    
    // Get video duration using ffprobe (if it's a video)
    let duration: number | undefined;
    if (scraperResult.data.type === 'video') {
      try {
        const { stdout: durationOutput } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
        duration = Math.round(parseFloat(durationOutput.trim()));
      } catch (error) {
        console.warn('[VideoDownload] Could not get duration:', error);
      }
    }
    
    console.log('[VideoDownload] Successfully downloaded using AdRipper logic:', filePath);
    return { filePath, mimeType, duration, downloadUrl, title };
    
  } catch (error) {
    console.error('[VideoDownload] Error downloading video with AdRipper:', error);
    return null;
  }
}

// Fallback function for YouTube and other platforms using yt-dlp
async function downloadVideoWithYtDlp(url: string): Promise<{ filePath: string; mimeType: string; duration?: number } | null> {
  try {
    const tempDir = '/tmp';
    const outputPath = path.join(tempDir, `social_video_${Date.now()}.%(ext)s`);
    
    // Use yt-dlp to download video with specific format preferences
    const command = `yt-dlp -f "best[height<=720][ext=mp4]/best[ext=mp4]/best" --no-playlist -o "${outputPath}" "${url}"`;
    
    console.log('[VideoDownload] Using yt-dlp fallback for:', url);
    const { stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`yt-dlp error: ${stderr}`);
    }
    
    // Find the downloaded file
    const files = fs.readdirSync(tempDir).filter(file => file.startsWith(`social_video_${Date.now().toString().slice(0, -3)}`));
    if (files.length === 0) {
      throw new Error('No video file found after download');
    }
    
    const filePath = path.join(tempDir, files[0]);
    const mimeType = files[0].endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    
    // Get video duration using ffprobe
    let duration: number | undefined;
    try {
      const { stdout: durationOutput } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
      duration = Math.round(parseFloat(durationOutput.trim()));
    } catch (error) {
      console.warn('[VideoDownload] Could not get duration:', error);
    }
    
    console.log('[VideoDownload] Successfully downloaded with yt-dlp:', filePath);
    return { filePath, mimeType, duration };
    
  } catch (error) {
    console.error('[VideoDownload] Error downloading video with yt-dlp:', error);
    return null;
  }
}

// Upload video to Gemini Files API using GoogleGenAI SDK (like other working parts of app)
async function uploadVideoToGeminiFilesAPI(filePath: string, mimeType: string, apiKey: string): Promise<string | null> {
  try {
    console.log('[GeminiFiles] Starting Files API upload using GoogleGenAI SDK:', filePath);
    
    const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
    console.log(`[GeminiFiles] File size: ${fileSizeMB.toFixed(2)}MB`);
    
    // Use GoogleGenAI SDK like other working parts of the app
    const ai = new GoogleGenAI({ apiKey });
    
    // Upload using the working pattern from generate-brief
    const uploadedFile = await ai.files.upload({
      file: filePath,
      config: { mimeType },
    });
    
    console.log(`[GeminiFiles] File uploaded, initial state: ${uploadedFile.state}`);

    if (!uploadedFile.name) {
      throw new Error('Failed to obtain file name for uploaded file');
    }

    // Wait for file to become ACTIVE (like in generate-brief)
    let attempts = 0;
    const maxAttempts = 30;
    let fileStatus = uploadedFile;
    
    while (fileStatus.state !== 'ACTIVE' && attempts < maxAttempts) {
      if (fileStatus.state === 'FAILED') {
        throw new Error('File processing failed');
      }
      
      console.log(`[GeminiFiles] File state: ${fileStatus.state}. Waiting for ACTIVE... (${attempts + 1}/${maxAttempts})`);
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check file status
      fileStatus = await ai.files.get({ name: uploadedFile.name });
      attempts++;
    }
    
    if (fileStatus.state !== 'ACTIVE') {
      throw new Error(`File did not become ACTIVE after ${maxAttempts} attempts. Final state: ${fileStatus.state}`);
    }

    if (!fileStatus.uri) {
      throw new Error('Failed to obtain URI for uploaded file');
    }

    console.log(`[GeminiFiles] File is now ACTIVE. URI: ${fileStatus.uri}`);
    return fileStatus.uri;
    
  } catch (error) {
    console.error('[GeminiFiles] Error uploading to Gemini Files API:', error);
    
    // Fallback to inline data for smaller files
    if (fs.existsSync(filePath)) {
      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
      
      if (fileSizeMB <= 20) {
        console.log('[GeminiFiles] Falling back to inline data for small file');
        return 'INLINE_DATA'; // Special marker to use inline data
      }
    }
    
    return null;
  }
}

// Comprehensive AI analysis with actual video file
async function analyzeContent(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  url: string,
  platform: string,
  contentType: 'image' | 'video',
  sourceType: 'organic_social' | 'paid_social',
  apiKey: string
): Promise<{ analysisResult: Partial<SocialAnalysisResult>; filePath?: string; mimeType?: string; downloadUrl?: string; title?: string }> {
  const isPaid = sourceType === 'paid_social';
  
  let videoFile: string | null = null;
  let tempFilePath: string | undefined;
  let downloadUrl: string | undefined;
  let title: string | undefined;
  let mimeType: string | undefined;
  
  // Download and prepare video if it's video content
  if (contentType === 'video') {
    const downloadResult = await downloadVideoUsingAdRipper(url);
    if (downloadResult) {
      tempFilePath = downloadResult.filePath;
      mimeType = downloadResult.mimeType;
      downloadUrl = downloadResult.downloadUrl;
      title = downloadResult.title;
      
      // Try to upload to Gemini Files API first
      videoFile = await uploadVideoToGeminiFilesAPI(downloadResult.filePath, downloadResult.mimeType, apiKey);
    }
  }
  
  const prompt = `Analyze this ${platform} ${contentType} ${isPaid ? 'advertisement' : 'organic post'}${videoFile ? ' (video file provided)' : ` from URL: ${url}`}

Please provide a comprehensive analysis including:

1. **Content Overview**:
   - Brief description of what's shown
   - Main message or value proposition
   - Target audience apparent from the content

2. **${contentType === 'video' ? 'Video' : 'Visual'} Analysis**:
   ${contentType === 'video' ? `
   - Estimated duration (in seconds)
   - Number of speakers/people featured
   - Visual hook description (first 3 seconds)
   - Audio hook description (opening words/sounds)
   - Structural flow (key scenes/transitions)
   - Product introduction timing (when product first appears)
   ` : `
   - Visual composition and style
   - Key visual elements and colors
   - Text overlays or captions
   - Overall aesthetic and mood
   `}

3. **${isPaid ? 'Ad Strategy' : 'Content Strategy'} Analysis**:
   ${isPaid ? `
   - Ad format classification (UGC, testimonial, demo, lifestyle, etc.)
   - Copywriting framework used (AIDA, PAS, Problem-Solution, etc.)
   - Emotions targeted (fear, desire, urgency, trust, etc.)
   - Call-to-action approach
   - Positioning strategy
   ` : `
   - Content format (educational, entertainment, behind-scenes, etc.)
   - Engagement tactics used
   - Community building elements
   - Brand positioning approach
   - Authenticity factors
   `}

4. **${contentType === 'video' ? 'Transcript' : 'Text Content'}**:
   ${contentType === 'video' ? `
   - Full transcript of spoken words
   - Key phrases and hooks
   - Tone and delivery style
   ` : `
   - All visible text content
   - Caption or description text
   - Hashtags and mentions
   `}

5. **Marketing Insights**:
   - What makes this content effective
   - Target demographic insights
   - Scalability potential
   - Key takeaways for similar campaigns

Format your response as detailed markdown with clear sections and bullet points. Focus on actionable insights that can inform future creative strategy.`;

  try {
    let result;
    
    if (videoFile && videoFile !== 'INLINE_DATA') {
      // Use Files API for video analysis
      result = await model.generateContent([
        prompt,
        {
          fileData: {
            mimeType: mimeType || 'video/mp4',
            fileUri: videoFile // videoFile is already the full URI from GoogleGenAI SDK
          }
        }
      ]);
    } else if (videoFile === 'INLINE_DATA' && tempFilePath) {
      // Fallback to inline data for smaller files
      const fileBuffer = fs.readFileSync(tempFilePath);
      const base64Data = fileBuffer.toString('base64');
      
      result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { 
                mimeType: mimeType || 'video/mp4', 
                data: base64Data 
            }},
            { text: "\n\nAnalyze this social media video and provide the comprehensive analysis requested above." }
          ]
        }]
      });
    } else {
      // Fallback to URL-based analysis
      result = await model.generateContent(prompt);
    }
    
    const analysis = result.response.text();
    
    // Extract specific fields from the analysis using regex patterns
    const extractField = (pattern: RegExp, text: string): string | undefined => {
      const match = text.match(pattern);
      return match ? match[1].trim() : undefined;
    };
    
    const extractNumber = (pattern: RegExp, text: string): number | undefined => {
      const match = text.match(pattern);
      return match ? parseInt(match[1]) : undefined;
    };
    
    const extractArray = (pattern: RegExp, text: string): string[] => {
      const match = text.match(pattern);
      if (!match) return [];
      return match[1].split(',').map(item => item.trim()).filter(Boolean);
    };

    const analysisResult = {
      transcript: extractField(/(?:transcript|spoken words|dialogue)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      structuralFlow: extractArray(/(?:structural flow|key scenes|transitions)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      visualDescription: extractField(/(?:visual|composition|description)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      numberOfSpeakers: extractNumber(/(?:speakers?|people)[\s\S]*?(\d+)/i, analysis),
      adFormat: extractField(/(?:ad format|format classification)[\s\S]*?[:\-]\s*([^\n]*)/i, analysis),
      copywritingFramework: extractField(/(?:copywriting framework|framework)[\s\S]*?[:\-]\s*([^\n]*)/i, analysis),
      visualHook: extractField(/(?:visual hook)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      audioHook: extractField(/(?:audio hook)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      emotionTargeted: extractArray(/(?:emotions? targeted)[\s\S]*?[:\-]\s*([^\n]*(?:\n(?!\#)[^\n]*)*)/i, analysis),
      productIntroTime: extractNumber(/(?:product intro|introduction timing)[\s\S]*?(\d+)/i, analysis),
      markdown: analysis,
    };

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('[Cleanup] Deleted temp file:', tempFilePath);
      } catch (error) {
        console.warn('[Cleanup] Could not delete temp file:', error);
      }
    }

    return {
      analysisResult,
      filePath: tempFilePath,
      mimeType,
      downloadUrl,
      title
    };

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('[Cleanup] Could not delete temp file after error:', cleanupError);
      }
    }

    return {
      analysisResult: {
        markdown: `# Analysis Failed\n\nUnable to analyze content from ${url}. Please try again or analyze manually.`,
      }
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, sourceType, brandId }: SocialAnalysisRequest = await request.json();

    if (!url || !sourceType || !brandId) {
      return NextResponse.json(
        { error: 'URL, source type, and brand ID are required' },
        { status: 400 }
      );
    }

    // Validate source type
    if (!['organic_social', 'paid_social'].includes(sourceType)) {
      return NextResponse.json(
        { error: 'Invalid source type. Must be organic_social or paid_social' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gemini API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log(`[SocialAnalysis] Starting analysis for: ${url} (${sourceType})`);

    // Detect platform and content type
    const platform = detectPlatform(url);
    const contentType = getContentType(url);

    console.log(`[SocialAnalysis] Step 1: Scraping and saving to Supabase first...`);

    // STEP 1: Get metadata using AdRipper scrapers
    let downloadedTitle = `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${sourceType === 'paid_social' ? 'Ad' : 'Post'}`;
    let finalDownloadUrl = url;
    let thumbnailUrl: string | undefined;

    try {
      let scraperResult;
      
      switch (platform) {
        case 'facebook':
          scraperResult = await scrapeFacebook(url);
          break;
        case 'instagram':
          scraperResult = await scrapeInstagram(url);
          break;
        case 'tiktok':
          scraperResult = await scrapeTikTok(url);
          break;
      }
      
      if (scraperResult && scraperResult.status === 200 && scraperResult.data) {
        downloadedTitle = scraperResult.data.title || downloadedTitle;
        // Fix URL encoding issues before using
        finalDownloadUrl = scraperResult.data.url ? cleanUrl(scraperResult.data.url) : finalDownloadUrl;
        thumbnailUrl = scraperResult.data.thumbnail;
      }
    } catch (error) {
      console.warn('[SocialAnalysis] Could not get metadata from scraper:', error);
    }

    // STEP 2: Save to AdRipper database with actual file storage FIRST
    console.log(`[SocialAnalysis] Step 2: Saving to AdRipper database and storage...`);
    const adripperId = await saveToAdRipper(
      supabase,
      user.id,
      brandId,
      url,
      platform,
      contentType,
      downloadedTitle,
      finalDownloadUrl, // Pass the actual download URL from scraper
      thumbnailUrl, // Pass thumbnail URL if available
      'Analysis pending...', // Temporary description
      undefined, // duration - will be updated after analysis
      undefined // dimensions - would need to be extracted from actual content
    );

    // STEP 3: Perform AI analysis (now that file is safely stored)
    console.log(`[SocialAnalysis] Step 3: Performing AI analysis...`);
    const analysisData = await analyzeContent(model, url, platform, contentType, sourceType, apiKey);
    const { analysisResult } = analysisData;

    // STEP 4: Save to OneSheet context with proper source_type mapping
    console.log(`[SocialAnalysis] Step 4: Saving analysis to OneSheet context...`);
    
    // Map API sourceType to valid database source_type values
    const getContextSourceType = (sourceType: string): string => {
      if (sourceType === 'paid_social') {
        return 'competitor_ads'; // Paid social ads
      } else {
        return 'competitor_social'; // Organic social content
      }
    };

    const contextSourceType = getContextSourceType(sourceType);
    
    // Save analysis to OneSheet context if we have an onesheet_id (from query params or context)
    // For now, we'll return the data for the frontend to handle context saving
    // since we don't have the onesheet_id in this endpoint

    // Compile final result
    const result: SocialAnalysisResult = {
      url,
      title: `${downloadedTitle} Analysis`,
      platform,
      contentType,
      adripperId: adripperId || undefined,
      downloadUrl: finalDownloadUrl !== url ? finalDownloadUrl : undefined, // Only include if different from original
      timestamp: new Date().toISOString(),
      contextSourceType, // Include mapped source type for frontend
      ...analysisResult,
    };

    console.log(`[SocialAnalysis] Analysis complete for: ${url}`);

    return NextResponse.json({
      success: true,
      result,
      adripper_integrated: !!adripperId,
      platform,
      content_type: contentType,
      context_source_type: contextSourceType, // For frontend to use when saving to context
    });

  } catch (error) {
    console.error('[SocialAnalysis] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze social media content', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 