// Self-contained social media scrapers without external dependencies
// Uses only built-in Node.js modules and browser APIs

interface ScraperResult {
  status: number;
  data?: {
    url: string;
    title: string;
    type: 'image' | 'video';
    thumbnail?: string;
  };
  msg?: string;
}

// Helper function to create success response
function createSuccessResponse(data: {
  url: string;
  title: string;
  type: 'image' | 'video';
  thumbnail?: string;
}): ScraperResult {
  return {
    status: 200,
    data: data,
    msg: null
  };
}

// Helper function to create error response
function createErrorResponse(message: string): ScraperResult {
  return {
    status: 404,
    msg: message,
    data: null
  };
}

// Helper function to validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper function to extract text between patterns
function extractBetween(text: string, start: string, end: string): string | null {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return null;
  
  const searchStart = startIndex + start.length;
  const endIndex = text.indexOf(end, searchStart);
  if (endIndex === -1) return null;
  
  return text.substring(searchStart, endIndex);
}

// Helper function to clean URL from escapes
function cleanUrl(url: string): string {
  return url
    .replace(/\\u0026/g, '&')
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&');
}

// Facebook scraper
export async function scrapeFacebook(url: string): Promise<ScraperResult> {
  try {
    if (!isValidUrl(url) || !/facebook\.com|fb\.watch/i.test(url)) {
      return createErrorResponse('Invalid Facebook URL: ' + url);
    }

    console.log('Scraping Facebook URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return createErrorResponse(`Failed to fetch Facebook page: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract title from meta tag or title tag
    let title = extractBetween(html, '<meta property="og:title" content="', '"') ||
                extractBetween(html, '<title>', '</title>') ||
                'Facebook Media';
    
    // Clean HTML entities
    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    
    // Look for video URLs in meta tags
    let videoUrl = extractBetween(html, '<meta property="og:video" content="', '"') ||
                   extractBetween(html, '<meta property="og:video:secure_url" content="', '"');
    
    // Look for image URLs
    const imageUrl = extractBetween(html, '<meta property="og:image" content="', '"');
    
    // Search for video URLs in script content
    if (!videoUrl) {
      const playableMatch = html.match(/"playable_url":"([^"]+)"/);
      if (playableMatch) {
        videoUrl = cleanUrl(playableMatch[1]);
      }
    }
    
    if (!videoUrl) {
      const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/);
      if (hdMatch) {
        videoUrl = cleanUrl(hdMatch[1]);
      }
    }
    
    if (!videoUrl) {
      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/);
      if (sdMatch) {
        videoUrl = cleanUrl(sdMatch[1]);
      }
    }
    
    // Return video if found
    if (videoUrl && isValidUrl(videoUrl)) {
      return createSuccessResponse({
        url: videoUrl,
        title: title,
        type: 'video',
        thumbnail: imageUrl
      });
    }
    
    // Return image if found and no video
    if (imageUrl && isValidUrl(imageUrl)) {
      return createSuccessResponse({
        url: imageUrl,
        title: title,
        type: 'image'
      });
    }
    
    return createErrorResponse('No downloadable media found in this Facebook post');
    
  } catch (error) {
    console.error('Facebook scraping error:', error);
    return createErrorResponse(`Facebook scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Instagram scraper
export async function scrapeInstagram(url: string): Promise<ScraperResult> {
  try {
    if (!isValidUrl(url) || !/instagram\.com/i.test(url)) {
      return createErrorResponse('Invalid Instagram URL: ' + url);
    }

    console.log('Scraping Instagram URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return createErrorResponse(`Failed to fetch Instagram page: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract title
    let title = extractBetween(html, '<meta property="og:title" content="', '"') ||
                extractBetween(html, '<title>', '</title>') ||
                'Instagram Media';
    
    // Clean HTML entities
    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    
    // Look for video URLs in meta tags
    let videoUrl = extractBetween(html, '<meta property="og:video" content="', '"') ||
                   extractBetween(html, '<meta property="og:video:secure_url" content="', '"');
    
    // Look for image URLs
    let imageUrl = extractBetween(html, '<meta property="og:image" content="', '"');
    
    // Search for media URLs in script content
    if (!videoUrl) {
      const videoMatch = html.match(/"video_url":"([^"]+)"/);
      if (videoMatch) {
        videoUrl = cleanUrl(videoMatch[1]);
      }
    }
    
    if (!imageUrl) {
      const displayMatch = html.match(/"display_url":"([^"]+)"/);
      if (displayMatch) {
        imageUrl = cleanUrl(displayMatch[1]);
      }
    }
    
    // Try to extract from shared data
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
    if (sharedDataMatch && !videoUrl && !imageUrl) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        if (media) {
          if (media.is_video && media.video_url) {
            videoUrl = media.video_url;
          } else if (media.display_url) {
            imageUrl = media.display_url;
          }
        }
      } catch {
        console.log('Failed to parse Instagram shared data');
      }
    }
    
    // Return video if found
    if (videoUrl && isValidUrl(videoUrl)) {
      return createSuccessResponse({
        url: videoUrl,
        title: title,
        type: 'video',
        thumbnail: imageUrl
      });
    }
    
    // Return image if found
    if (imageUrl && isValidUrl(imageUrl)) {
      return createSuccessResponse({
        url: imageUrl,
        title: title,
        type: 'image'
      });
    }
    
    return createErrorResponse('No downloadable media found in this Instagram post');
    
  } catch (error) {
    console.error('Instagram scraping error:', error);
    return createErrorResponse(`Instagram scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// TikTok scraper
export async function scrapeTikTok(url: string): Promise<ScraperResult> {
  try {
    if (!isValidUrl(url) || !/tiktok\.com/i.test(url)) {
      return createErrorResponse('Invalid TikTok URL: ' + url);
    }

    console.log('Scraping TikTok URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      return createErrorResponse(`Failed to fetch TikTok page: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract title
    let title = extractBetween(html, '<meta property="og:title" content="', '"') ||
                extractBetween(html, '<title>', '</title>') ||
                'TikTok Video';
    
    // Clean HTML entities
    title = title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    
    // Look for video URLs in meta tags
    let videoUrl = extractBetween(html, '<meta property="og:video" content="', '"') ||
                   extractBetween(html, '<meta property="og:video:secure_url" content="', '"');
    
    // Look for image URLs (thumbnail)
    let imageUrl = extractBetween(html, '<meta property="og:image" content="', '"');
    
    // Search for video URLs in script content
    if (!videoUrl) {
      const playAddrMatch = html.match(/"playAddr":"([^"]+)"/);
      if (playAddrMatch) {
        videoUrl = cleanUrl(playAddrMatch[1]);
      }
    }
    
    if (!videoUrl) {
      const downloadMatch = html.match(/"downloadAddr":"([^"]+)"/);
      if (downloadMatch) {
        videoUrl = cleanUrl(downloadMatch[1]);
      }
    }
    
    // Look for cover/thumbnail
    if (!imageUrl) {
      const coverMatch = html.match(/"cover":"([^"]+)"/);
      if (coverMatch) {
        imageUrl = cleanUrl(coverMatch[1]);
      }
    }
    
    // Try to extract from universal data
    const universalDataMatch = html.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.+?});/);
    if (universalDataMatch && !videoUrl) {
      try {
        const universalData = JSON.parse(universalDataMatch[1]);
        const defaultScope = universalData?.['__DEFAULT_SCOPE__'];
        if (defaultScope) {
          // Look for video data in the default scope
          const videoData = Object.values(defaultScope).find((item: unknown) => 
            item && typeof item === 'object' && 
            (item as Record<string, unknown>).video !== undefined
          ) as Record<string, Record<string, string>> | undefined;
          
          if (videoData?.video?.playAddr) {
            videoUrl = videoData.video.playAddr;
          } else if (videoData?.video?.downloadAddr) {
            videoUrl = videoData.video.downloadAddr;
          }
        }
      } catch {
        console.log('Failed to parse TikTok universal data');
      }
    }
    
    // Return video if found
    if (videoUrl && isValidUrl(videoUrl)) {
      return createSuccessResponse({
        url: videoUrl,
        title: title,
        type: 'video',
        thumbnail: imageUrl
      });
    }
    
    return createErrorResponse('No downloadable video found in this TikTok post');
    
  } catch (error) {
    console.error('TikTok scraping error:', error);
    return createErrorResponse(`TikTok scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 