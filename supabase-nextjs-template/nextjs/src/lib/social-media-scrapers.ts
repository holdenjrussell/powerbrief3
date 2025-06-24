// Self-contained social media scrapers without external dependencies
// Uses only built-in Node.js modules and browser APIs

interface MediaData {
  url: string;
  title: string;
  type: 'video' | 'image';
  thumbnail?: string;
  description?: string;
  duration?: string;
  videoId?: string | null;
  source?: string;
}

interface ScraperResult {
  status: number;
  data?: MediaData;
  msg?: string;
}

// Helper function to create success response
function createSuccessResponse(data: MediaData): ScraperResult {
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
    .replace(/\\\//g, '/')  // Handle escaped forward slashes
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&');
}

// Helper function to extract URLs from DASH manifest
function extractUrlsFromDashManifest(dashManifest: string): { hdUrl?: string; sdUrl?: string } {
  try {
    // Unescape the manifest first
    const unescapedManifest = dashManifest
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .replace(/\\u003C/g, '<')
      .replace(/\\u003E/g, '>')
      .replace(/\\u0026/g, '&')
      .replace(/\\\\/g, '\\');
    
    // Extract URLs from the manifest
    const urls: string[] = [];
    const urlMatches = unescapedManifest.matchAll(/https?:\/\/[^"<>\s]+\.mp4[^"<>\s]*/gi);
    
    for (const match of urlMatches) {
      urls.push(match[0]);
    }
    
    // Sort URLs by quality (assuming higher resolution files are larger)
    // Look for quality indicators in the URL
    let hdUrl: string | undefined;
    let sdUrl: string | undefined;
    
    for (const url of urls) {
      if (url.includes('720p') || url.includes('hd')) {
        hdUrl = url;
      } else if (!sdUrl) {
        sdUrl = url;
      }
    }
    
    // If no HD URL found, use the first URL as HD
    if (!hdUrl && urls.length > 0) {
      hdUrl = urls[0];
    }
    
    return { hdUrl, sdUrl };
  } catch (error) {
    console.error('Error extracting URLs from DASH manifest:', error);
    return {};
  }
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Helper function to extract video URLs from embedded JSON in script tags
function extractVideoFromEmbeddedJson(html: string): { hdUrl?: string; sdUrl?: string; videoId?: string } {
  try {
    console.log('Attempting to extract video from embedded JSON data...');
    
    // First, look for browser_native_hd_url anywhere in the entire HTML
    // This catches cases where the JSON might not be in a standard script tag
    const hdUrlMatch = html.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/);
    const sdUrlMatch = html.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/);
    const videoIdMatch = html.match(/"video_id"\s*:\s*"(\d+)"/);
    
    const result: { hdUrl?: string; sdUrl?: string; videoId?: string } = {};
    
    if (hdUrlMatch) {
      // Unescape the URL - handle all common escape sequences
      result.hdUrl = hdUrlMatch[1]
        .replace(/\\\//g, '/')
        .replace(/\\u0026/g, '&')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\u003C/g, '<')
        .replace(/\\u003E/g, '>')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      console.log('Found HD URL in page source:', result.hdUrl);
    }
    
    if (sdUrlMatch) {
      // Unescape the URL
      result.sdUrl = sdUrlMatch[1]
        .replace(/\\\//g, '/')
        .replace(/\\u0026/g, '&')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\u003C/g, '<')
        .replace(/\\u003E/g, '>')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      console.log('Found SD URL in page source:', result.sdUrl);
    }
    
    if (videoIdMatch) {
      result.videoId = videoIdMatch[1];
      console.log('Found video ID in page source:', result.videoId);
    }
    
    // If we found URLs, return them
    if (result.hdUrl || result.sdUrl) {
      return result;
    }
    
    // Otherwise, try the more specific script tag search
    // Look for script tags with type="application/json" and data-sjs attribute
    const scriptMatches = html.matchAll(/<script[^>]*type="application\/json"[^>]*data-sjs[^>]*>([^<]+)<\/script>/gi);
    
    for (const match of scriptMatches) {
      const jsonContent = match[1];
      
      // Look for browser_native_hd_url in the JSON content
      const hdMatch = jsonContent.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/);
      const sdMatch = jsonContent.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/);
      const videoIdMatch = jsonContent.match(/"video_id"\s*:\s*"(\d+)"/);
      const dashMatch = jsonContent.match(/"dash_manifest_xml_string"\s*:\s*"([^"]+)"/);
      
      if (hdMatch) {
        // Unescape the URL
        result.hdUrl = hdMatch[1]
          .replace(/\\\//g, '/')
          .replace(/\\u0026/g, '&')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        console.log('Found HD URL in embedded JSON script:', result.hdUrl);
      }
      
      if (sdMatch) {
        // Unescape the URL
        result.sdUrl = sdMatch[1]
          .replace(/\\\//g, '/')
          .replace(/\\u0026/g, '&')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        console.log('Found SD URL in embedded JSON script:', result.sdUrl);
      }
      
      if (videoIdMatch) {
        result.videoId = videoIdMatch[1];
        console.log('Found video ID in embedded JSON script:', result.videoId);
      }
      
      // If we found URLs, also check for DASH manifest as a backup
      if (dashMatch && (!result.hdUrl && !result.sdUrl)) {
        console.log('Found DASH manifest in embedded JSON, extracting URLs...');
        const dashUrls = extractUrlsFromDashManifest(dashMatch[1]);
        if (dashUrls.hdUrl) result.hdUrl = dashUrls.hdUrl;
        if (dashUrls.sdUrl) result.sdUrl = dashUrls.sdUrl;
      }
      
      // If we found any video URLs, return them
      if (result.hdUrl || result.sdUrl) {
        return result;
      }
    }
    
    // Also check for DASH manifest anywhere in the page as a last resort
    if (!result.hdUrl && !result.sdUrl) {
      const dashManifestMatch = html.match(/"dash_manifest_xml_string"\s*:\s*"([^"]+)"/);
      if (dashManifestMatch) {
        console.log('Found DASH manifest in page source, extracting URLs...');
        const dashUrls = extractUrlsFromDashManifest(dashManifestMatch[1]);
        if (dashUrls.hdUrl) {
          result.hdUrl = dashUrls.hdUrl;
          console.log('Extracted HD URL from DASH manifest');
        }
        if (dashUrls.sdUrl) {
          result.sdUrl = dashUrls.sdUrl;
          console.log('Extracted SD URL from DASH manifest');
        }
      }
    }
    
    console.log('Video extraction complete. Found:', {
      hdUrl: result.hdUrl ? 'yes' : 'no',
      sdUrl: result.sdUrl ? 'yes' : 'no',
      videoId: result.videoId || 'none'
    });
    
    return result;
  } catch (error) {
    console.error('Error extracting video from embedded JSON:', error);
    return {};
  }
}

// Facebook scraper
export async function scrapeFacebook(url: string): Promise<ScraperResult> {
  try {
    if (!isValidUrl(url) || !/facebook\.com|fb\.watch/i.test(url)) {
      return createErrorResponse('Invalid Facebook URL: ' + url);
    }

    console.log('Scraping Facebook URL:', url);

    // Function to try scraping a URL with redirect handling
    const tryScrapingUrl = async (targetUrl: string): Promise<{ html: string; finalUrl: string }> => {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        },
        redirect: 'follow' // Explicitly follow redirects
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const finalUrl = response.url; // Get the final URL after redirects
      
      console.log(`Original URL: ${targetUrl}`);
      console.log(`Final URL after redirects: ${finalUrl}`);
      
      return { html, finalUrl };
    };

    // Try the original URL first
    let html: string;
    let finalUrl: string;
    
    try {
      const result = await tryScrapingUrl(url);
      html = result.html;
      finalUrl = result.finalUrl;
    } catch (error) {
      console.log('Original URL failed, trying alternate format...');
      
      // If the original URL fails and it's a /videos/ URL, try converting to /posts/
      if (url.includes('/videos/')) {
        const postsUrl = url.replace('/videos/', '/posts/');
        console.log('Trying /posts/ format:', postsUrl);
        
        try {
          const result = await tryScrapingUrl(postsUrl);
          html = result.html;
          finalUrl = result.finalUrl;
        } catch {
          return createErrorResponse(`Failed to fetch Facebook page: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        return createErrorResponse(`Failed to fetch Facebook page: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    let videoUrl: string | null = null;
    let videoTitle = '';
    let videoDuration = '';
    let videoDescription = '';
    let videoId: string | null = null;
    
    // First, try the new embedded JSON extraction method
    const embeddedJsonResult = extractVideoFromEmbeddedJson(html);
    if (embeddedJsonResult.hdUrl || embeddedJsonResult.sdUrl) {
      videoUrl = embeddedJsonResult.hdUrl || embeddedJsonResult.sdUrl;
      videoId = embeddedJsonResult.videoId || null;
      console.log('Successfully extracted video from embedded JSON');
    }
    
    // Check if this is a /posts/ URL or was redirected to one
    const isPostsUrl = url.includes('/posts/') || finalUrl.includes('/posts/');
    
    // For /posts/ URLs, prioritize looking for videoDeliveryLegacyFields
    if (!videoUrl && isPostsUrl) {
      console.log('Processing as a /posts/ URL, looking for videoDeliveryLegacyFields...');
      
      // Look for videoDeliveryLegacyFields with better regex that handles escaped characters
      // First, try to find the entire videoDeliveryLegacyFields object
      const videoFieldsMatch = html.match(/"videoDeliveryLegacyFields"\s*:\s*\{[^}]*"browser_native_[^}]+\}/);
      
      if (videoFieldsMatch) {
        const videoFieldsContent = videoFieldsMatch[0];
        console.log('Found videoDeliveryLegacyFields object');
        
        // Look for browser_native_hd_url with pattern that captures the full URL including escaped characters
        const hdMatch = videoFieldsContent.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/);
        if (hdMatch) {
          // Clean the URL - unescape the forward slashes
          videoUrl = hdMatch[1].replace(/\\\//g, '/');
          console.log('Found HD video URL from videoDeliveryLegacyFields');
        }
        
        // If no HD, try SD
        if (!videoUrl) {
          const sdMatch = videoFieldsContent.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/);
          if (sdMatch) {
            videoUrl = sdMatch[1].replace(/\\\//g, '/');
            console.log('Found SD video URL from videoDeliveryLegacyFields');
          }
        }
      }
      
      // If that didn't work, try a more global search
      if (!videoUrl) {
        console.log('Trying global search for browser_native URLs...');
        
        // Look for browser_native_hd_url anywhere in the page
        const hdGlobalMatch = html.match(/"browser_native_hd_url"\s*:\s*"([^"]+)"/);
        if (hdGlobalMatch) {
          videoUrl = hdGlobalMatch[1].replace(/\\\//g, '/');
          console.log('Found HD video URL with global search');
        }
        
        // Try SD as fallback
        if (!videoUrl) {
          const sdGlobalMatch = html.match(/"browser_native_sd_url"\s*:\s*"([^"]+)"/);
          if (sdGlobalMatch) {
            videoUrl = sdGlobalMatch[1].replace(/\\\//g, '/');
            console.log('Found SD video URL with global search');
          }
        }
      }
      
      // Also try to extract from DASH manifest if available
      if (!videoUrl) {
        const dashManifestMatch = html.match(/"dash_manifest_xml_string"\s*:\s*"([^"]+)"/);
        if (dashManifestMatch) {
          console.log('Found DASH manifest, attempting to extract URLs...');
          const dashUrls = extractUrlsFromDashManifest(dashManifestMatch[1]);
          videoUrl = dashUrls.hdUrl || dashUrls.sdUrl || null;
        }
      }
    }

    // Look for browser_native_hd_url (HD quality) - global search
    if (!videoUrl) {
      // Try multiple patterns to catch different JSON formatting
      const patterns = [
        /"browser_native_hd_url"\s*:\s*"([^"]+)"/,
        /"browser_native_hd_url":"([^"]+)"/,
        /'browser_native_hd_url'\s*:\s*'([^']+)'/
      ];
      
      for (const pattern of patterns) {
        const hdMatch = html.match(pattern);
        if (hdMatch) {
          videoUrl = cleanUrl(hdMatch[1]);
          console.log('Found HD video URL with pattern:', pattern);
          break;
        }
      }
    }
    
    // Look for browser_native_sd_url (SD quality) as fallback - global search
    if (!videoUrl) {
      // Try multiple patterns to catch different JSON formatting
      const patterns = [
        /"browser_native_sd_url"\s*:\s*"([^"]+)"/,
        /"browser_native_sd_url":"([^"]+)"/,
        /'browser_native_sd_url'\s*:\s*'([^']+)'/
      ];
      
      for (const pattern of patterns) {
        const sdMatch = html.match(pattern);
        if (sdMatch) {
          videoUrl = cleanUrl(sdMatch[1]);
          console.log('Found SD video URL with pattern:', pattern);
          break;
        }
      }
    }
    
    // Skip meta tag extraction for /posts/ URLs since they typically don't have proper meta tags
    if (!isPostsUrl) {
      // For non-posts URLs, try meta tags
      const metaMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+content="([^"]+)"\s+property="og:video"/i);
      if (metaMatch && !videoUrl) {
        videoUrl = decodeURIComponent(metaMatch[1]);
        console.log('Found video URL from og:video meta tag');
      }
    }
    
    // Try to get video ID from URL or other sources
    if (!videoId) {
      // From the URL itself
      const videoIdMatch = url.match(/\/videos\/(\d+)/) || 
                          url.match(/[?&]v=(\d+)/) || 
                          url.match(/\/watch\/\?v=(\d+)/) ||
                          url.match(/\/posts\/(\d+)/) ||
                          finalUrl.match(/\/videos\/(\d+)/) ||
                          finalUrl.match(/\/posts\/(\d+)/);
      if (videoIdMatch) {
        videoId = videoIdMatch[1];
        console.log('Extracted video ID from URL:', videoId);
      }
      
      // From the page content
      if (!videoId) {
        const idMatch = html.match(/"video_id"\s*:\s*"(\d+)"/) || 
                       html.match(/"videoID"\s*:\s*"(\d+)"/) ||
                       html.match(/"id"\s*:\s*"(\d+)"/);
        if (idMatch) {
          videoId = idMatch[1];
          console.log('Extracted video ID from page content:', videoId);
        }
      }
    }
    
    // Extract title
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                      html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i) ||
                      html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      videoTitle = decodeHtmlEntities(titleMatch[1]);
    }
    
    // Extract description
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);
    if (descMatch) {
      videoDescription = decodeHtmlEntities(descMatch[1]);
    }
    
    // Try to extract duration from JSON-LD or other sources
    try {
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
      if (jsonLdMatch) {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.duration) {
          videoDuration = jsonLd.duration;
        }
      }
    } catch {
      console.log('Failed to parse JSON-LD data');
    }
    
    if (videoUrl) {
      console.log('Successfully scraped Facebook video');
      return {
        status: 200,
        msg: 'Success',
        data: {
          url: videoUrl,
          type: 'video',
          title: videoTitle || 'Facebook Video',
          description: videoDescription,
          duration: videoDuration,
          videoId: videoId,
          source: 'facebook'
        }
      };
    }
    
    return createErrorResponse('Could not find video URL in Facebook page');
    
  } catch (error) {
    console.error('Facebook scraping error:', error);
    return createErrorResponse(`Error scraping Facebook: ${error instanceof Error ? error.message : 'Unknown error'}`);
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