import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { v4 as uuidv4 } from 'uuid';

// Facebook API Best Practices from documentation
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests

const REQUEST_DELAY = 1000; // 1 second delay between requests
const ASSET_DOWNLOAD_DELAY = 2000; // 2 second delay for asset downloads
const MAX_RETRIES = 2;
const BATCH_SIZE = 5; // Process assets in very small batches
const MAX_CONCURRENT_DOWNLOADS = 2; // Limit concurrent downloads

// Spending tier thresholds in descending order
const SPENDING_TIERS = [20000, 10000, 5000, 1000, 500, 100, 50, 10];

// Cache to prevent duplicate scraper calls for the same video ID (module-level)
const scraperCache = new Map<string, string | null>();

async function fetchAllAds(
  adAccountId: string, 
  metaAccessToken: string, 
  dateRange: any, 
  targetAdCount: number = 100
) {
  const baseFields = [
    'id',
    'name',
    'status',
    'creative{id,name,title,body,image_url,video_id,thumbnail_url,object_story_spec,asset_feed_spec,image_hash}',
    'insights{spend,impressions,clicks,ctr,cpm,cpp,actions,action_values,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_play_actions,video_avg_time_watched_actions}',
    'adset{id,name,targeting}',
    'campaign{id,name,objective}'
  ].join(',');

  let allAds: any[] = [];
  
  console.log(`Starting tiered ad fetch for top ${targetAdCount} highest spending ads`);

  // Try each spending tier until we have enough ads
  for (const minSpend of SPENDING_TIERS) {
    if (allAds.length >= targetAdCount) break;

    console.log(`Fetching ads with spend >= $${minSpend}`);
    
    const params = new URLSearchParams({
      fields: baseFields,
      date_preset: 'last_30d', // Use a fixed preset for now
      level: 'ad',
      limit: '25',
      sort: 'spend_descending',
      filtering: JSON.stringify([
        { field: 'impressions', operator: 'GREATER_THAN', value: 0 },
        { field: 'spend', operator: 'GREATER_THAN_OR_EQUAL', value: minSpend }
      ])
    });

    let nextPageUrl = `https://graph.facebook.com/v22.0/act_${adAccountId}/ads?${params.toString()}&access_token=${metaAccessToken}`;
    let tierAds: any[] = [];
    let pageCount = 0;
    const maxPagesPerTier = 10; // Limit pages per tier to avoid getting stuck

    while (nextPageUrl && pageCount < maxPagesPerTier && (allAds.length + tierAds.length) < targetAdCount) {
      try {
        console.log(`  Tier $${minSpend}: Fetching page ${pageCount + 1}`);
        
        const response = await fetch(nextPageUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Meta API Error - Status: ${response.status}, Response: ${errorText}`);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          if (response.status === 400 && errorData.error?.message?.includes('video_thruplay_actions')) {
            console.log(`Video field error encountered, skipping tier $${minSpend}`);
            break;
          }
          
          // Skip this tier on error instead of failing completely
          console.warn(`Skipping tier $${minSpend} due to error: ${errorData.error?.message || 'Unknown error'}`);
          break;
        }

        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          const adsWithImpressions = data.data.filter(ad => {
            const impressions = ad.insights?.data?.[0]?.impressions || 0;
            const spend = ad.insights?.data?.[0]?.spend || 0;
            return parseInt(impressions) > 0 && parseFloat(spend) >= minSpend;
          });
          
          tierAds = tierAds.concat(adsWithImpressions);
          console.log(`  Tier $${minSpend}: Found ${adsWithImpressions.length} ads on page ${pageCount + 1}, total in tier: ${tierAds.length}`);
        }

        nextPageUrl = data.paging?.next || null;
        pageCount++;

        // Add delay between requests
        if (nextPageUrl) {
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
        }
      } catch (error) {
        console.error(`Error fetching tier $${minSpend}, page ${pageCount + 1}:`, error);
        break;
      }
    }

    // Add tier ads to total, avoiding duplicates
    const existingIds = new Set(allAds.map(ad => ad.id));
    const newAds = tierAds.filter(ad => !existingIds.has(ad.id));
    allAds = allAds.concat(newAds);
    
    console.log(`Tier $${minSpend} complete: ${tierAds.length} ads found, ${newAds.length} new ads added. Total: ${allAds.length}`);
    
    // Small delay between tiers
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
  }

  // Sort final results by spend descending and limit to target count
  allAds.sort((a, b) => {
    const spendA = parseFloat(a.insights?.data?.[0]?.spend || '0');
    const spendB = parseFloat(b.insights?.data?.[0]?.spend || '0');
    return spendB - spendA;
  });

  const finalAds = allAds.slice(0, targetAdCount);
  console.log(`Final result: ${finalAds.length} ads selected from ${allAds.length} total ads found`);
  
  return finalAds;
}

// Helper function to fetch actual video URL from Meta API - Step 4 from the guide
async function fetchVideoUrl(
  videoId: string, 
  accessToken: string, 
  brandId?: string, 
  supabase?: any
): Promise<string | null> {
  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    console.log(`Step 4: Fetching video source URL for video ${videoId}`);
    
    const response = await fetch(`https://graph.facebook.com/v22.0/${videoId}?fields=source&access_token=${accessToken}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Failed to fetch video URL for ${videoId}:`, response.status);
      const errorText = await response.text();
      console.warn(`Error response:`, errorText);
      
      // Check for OAuth permission error
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 10) {
          console.warn(`⚠️ OAuth Permission Error: The access token doesn't have permission to fetch video sources. This is expected for some accounts.`);
          
                      // ENHANCEMENT: Try using Facebook scraper as fallback to get real video URL
            console.log(`🔄 Attempting to extract video URL using Facebook scraper for video ${videoId}`);
            return await tryExtractVideoWithScraper(videoId, accessToken, brandId, supabase);
        }
      } catch (e) {
        // Not JSON, ignore
      }
      
      return null;
    }
    
    const data = await response.json();
    console.log(`Video fetch response for ${videoId}:`, JSON.stringify(data, null, 2));
    
    if (data.source) {
      console.log(`Found video source URL for ${videoId}`);
      return data.source;
    }
    
    console.warn(`No source URL found for video ${videoId}`);
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Timeout fetching video URL for ${videoId}`);
    } else {
      console.warn(`Error fetching video URL for ${videoId}:`, error.message || error);
    }
    return null;
  }
}

// Helper function to fetch actual image URL from Meta API using image hash
async function fetchImageUrl(imageHash: string, accessToken: string): Promise<string | null> {
  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Try to get image URL from hash - this may require special permissions
    const response = await fetch(`https://graph.facebook.com/v22.0/${imageHash}?fields=url&access_token=${accessToken}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Fallback to generic image URL construction
      return `https://scontent.xx.fbcdn.net/v/t45.1600-4/${imageHash}`;
    }
    
    const data = await response.json();
    return data.url || `https://scontent.xx.fbcdn.net/v/t45.1600-4/${imageHash}`;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Timeout fetching image URL for ${imageHash}`);
    } else {
      console.warn(`Error fetching image URL for ${imageHash}:`, error.message || error);
    }
    // Return constructed URL as fallback
    return `https://scontent.xx.fbcdn.net/v/t45.1600-4/${imageHash}`;
  }
}

// Helper function to fetch image URL using ad account and hash - following Meta's exact format
async function fetchImageUrlFromAdAccount(imageHash: string, adAccountId: string, accessToken: string): Promise<string | null> {
  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Use URL encoding for the hashes parameter with square brackets
    const hashesParam = encodeURIComponent(`["${imageHash}"]`);
    const url = `https://graph.facebook.com/v22.0/act_${adAccountId}/adimages?hashes=${hashesParam}&fields=url&access_token=${accessToken}`;
    
    console.log(`Fetching image URL for hash ${imageHash} from ad account ${adAccountId}`);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Failed to fetch image URL for hash ${imageHash}:`, response.status);
      const errorText = await response.text();
      console.warn(`Error response:`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`Image fetch response:`, JSON.stringify(data, null, 2));
    
    const images = data.data;
    
    if (images && images.length > 0) {
      // The response has the hash as the key
      const imageData = images.find((img: any) => img.hash === imageHash);
      if (imageData && imageData.url) {
        console.log(`Found image URL for hash ${imageHash}: ${imageData.url}`);
        return imageData.url;
      }
      
      // Fallback to first image if exact hash not found
      if (images[0].url) {
        console.log(`Using first image URL for hash ${imageHash}: ${images[0].url}`);
        return images[0].url;
      }
    }
    
    console.warn(`No image URL found in response for hash ${imageHash}`);
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Timeout fetching image URL for hash ${imageHash}`);
    } else {
      console.warn(`Error fetching image URL for hash ${imageHash}:`, error.message || error);
    }
    return null;
  }
}

// Helper function to download and store asset to Supabase with improved error handling
async function downloadAndStoreAsset(
  url: string, 
  assetId: string, 
  type: 'video' | 'image',
  supabase: any,
  brandId: string,
  onesheetId: string,
  adId: string
): Promise<string | null> {
  // Skip download if we've already processed this asset
  try {
    const { data: existingAsset } = await supabase
      .from('onesheet_ad_assets')
      .select('local_path')
      .eq('onesheet_id', onesheetId)
      .eq('ad_id', adId)
      .eq('asset_id', assetId)
      .single();
      
    if (existingAsset) {
      const { data: publicUrlData } = supabase.storage
        .from('onesheet-assets')
        .getPublicUrl(existingAsset.local_path);
      return publicUrlData.publicUrl;
    }
  } catch (error) {
    // Asset doesn't exist, continue with download
  }

  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Downloading ${type} asset: ${assetId} (attempt ${retryCount + 1})`);
      
      // Progressive delay based on retry count
      const delay = ASSET_DOWNLOAD_DELAY * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)',
          'Accept': type === 'video' ? 'video/*' : 'image/*'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (retryCount === maxRetries) {
          console.warn(`Failed to download asset ${assetId} after ${maxRetries + 1} attempts:`, response.status, response.statusText);
          return null;
        }
        retryCount++;
        continue;
      }
      
      const buffer = await response.arrayBuffer();
      
      // Skip very small files (likely error pages)
      if (buffer.byteLength < 1000) {
        console.warn(`Asset ${assetId} too small (${buffer.byteLength} bytes), skipping`);
        return null;
      }
      
      const fileExtension = type === 'video' ? 'mp4' : 'jpg';
      const fileName = `onesheet-assets/${brandId}/${assetId}.${fileExtension}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('onesheet-assets')
        .upload(fileName, buffer, {
          contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: true // Overwrite if exists
        });
      
      if (error) {
        console.warn(`Failed to upload asset ${assetId} to storage:`, error);
        if (retryCount === maxRetries) return null;
        retryCount++;
        continue;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('onesheet-assets')
        .getPublicUrl(fileName);
      
      // Save asset metadata to database
      try {
        await supabase
          .from('onesheet_ad_assets')
          .upsert({
            onesheet_id: onesheetId,
            ad_id: adId,
            asset_id: assetId,
            asset_type: type,
            original_url: url,
            local_path: fileName,
            file_size: buffer.byteLength,
            mime_type: type === 'video' ? 'video/mp4' : 'image/jpeg'
          }, {
            onConflict: 'onesheet_id,ad_id,asset_id'
          });
      } catch (dbError) {
        console.warn(`Failed to save asset metadata for ${assetId}:`, dbError);
        // Continue anyway - the asset is still uploaded
      }
      
      return publicUrlData.publicUrl;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Timeout downloading asset ${assetId} (attempt ${retryCount + 1})`);
      } else {
        console.warn(`Error downloading/storing asset ${assetId} (attempt ${retryCount + 1}):`, error.message || error);
      }
      
      if (retryCount === maxRetries) {
        return null;
      }
      retryCount++;
    }
  }
  
  return null;
}

// Enhanced function to extract video URLs using scraper with multiple URL formats
async function tryExtractVideoWithScraper(
  videoId: string, 
  accessToken?: string, 
  brandId?: string,
  supabase?: any
): Promise<string | null> {
  // Check cache first to prevent duplicate scraping
  if (scraperCache.has(videoId)) {
    const cachedResult = scraperCache.get(videoId);
    console.log(`🔄 Using cached scraper result for video ${videoId}: ${cachedResult ? 'success (' + cachedResult.substring(0, 50) + '...)' : 'failed'}`);
    return cachedResult;
  }
  
  console.log(`🆕 No cache found for video ${videoId}, starting fresh scraper attempt`);
  try {
    const { scrapeFacebook } = await import('@/lib/social-media-scrapers');
    
    // First, try to get page information from the video if we have access token
    let pageId: string | null = null;
    if (accessToken) {
      try {
        console.log(`🔍 Attempting to get page info for video ${videoId}`);
        const videoInfoUrl = `https://graph.facebook.com/v22.0/${videoId}?fields=from{id,username,name}&access_token=${accessToken}`;
        const videoInfoResponse = await fetch(videoInfoUrl);
        
        if (videoInfoResponse.ok) {
          const videoInfo = await videoInfoResponse.json();
          if (videoInfo.from) {
            pageId = videoInfo.from.username || videoInfo.from.id;
            console.log(`✅ Found page info: ${pageId} (${videoInfo.from.name})`);
          }
        }
      } catch (error) {
        console.log(`❌ Could not get page info for video ${videoId}:`, error);
      }
    }
    
    // Get brand's Facebook pages as fallback options
    let brandPageIds: string[] = [];
    if (brandId && supabase) {
      try {
        console.log(`🔍 Fetching brand's Facebook pages for video ${videoId}`);
        const { data: brand } = await supabase
          .from('brands')
          .select('meta_facebook_pages, meta_manual_page_labels, meta_default_facebook_page_id, meta_facebook_page_id')
          .eq('id', brandId)
          .single();
          
        if (brand) {
          // Collect all page IDs from various sources
          const pageIds = new Set<string>();
          
          // Add default/primary page IDs
          if (brand.meta_default_facebook_page_id) {
            pageIds.add(brand.meta_default_facebook_page_id);
          }
          if (brand.meta_facebook_page_id) {
            pageIds.add(brand.meta_facebook_page_id);
          }
          
          // Add pages from meta_facebook_pages array
          if (brand.meta_facebook_pages && Array.isArray(brand.meta_facebook_pages)) {
            for (const page of brand.meta_facebook_pages) {
              if (page?.id) pageIds.add(page.id);
              if (page?.name) pageIds.add(page.name); // For named pages
            }
          }
          
          // Add manual page labels
          if (brand.meta_manual_page_labels && typeof brand.meta_manual_page_labels === 'object') {
            Object.keys(brand.meta_manual_page_labels).forEach(pageId => {
              pageIds.add(pageId);
            });
          }
          
          brandPageIds = Array.from(pageIds);
          console.log(`✅ Found ${brandPageIds.length} brand page IDs:`, brandPageIds);
        }
      } catch (error) {
        console.log(`❌ Could not fetch brand pages:`, error);
      }
    }
    
    // Try different URL formats that Facebook uses for videos
    const urlFormats = [
      `https://www.facebook.com/video.php?v=${videoId}`,
      `https://www.facebook.com/watch/?v=${videoId}`,
      `https://fb.watch/${videoId}`,
      `https://www.facebook.com/videos/${videoId}`,
    ];
    
    // If we found a page ID from API, add page-specific URLs to try first
    if (pageId) {
      urlFormats.unshift(
        `https://www.facebook.com/${pageId}/videos/${videoId}`,
        `https://www.facebook.com/${pageId}/posts/${videoId}`
      );
    }
    
    // Add brand page IDs as additional fallback options
    for (const brandPageId of brandPageIds) {
      if (brandPageId !== pageId) { // Don't duplicate if already added
        urlFormats.push(
          `https://www.facebook.com/${brandPageId}/videos/${videoId}`,
          `https://www.facebook.com/${brandPageId}/posts/${videoId}`
        );
      }
    }
    
    for (let i = 0; i < urlFormats.length; i++) {
      const url = urlFormats[i];
      console.log(`🔍 Trying format ${i + 1}/${urlFormats.length}: ${url}`);
      
      try {
        const scraperResult = await scrapeFacebook(url);
        
        if (scraperResult.status === 200 && scraperResult.data?.type === 'video' && scraperResult.data.url) {
          console.log(`✅ Successfully extracted video URL using format ${i + 1}: ${scraperResult.data.url}`);
          // Cache the successful result
          scraperCache.set(videoId, scraperResult.data.url);
          console.log(`💾 Cached successful result for video ${videoId} (${scraperResult.data.url.substring(0, 50)}...)`);
          return scraperResult.data.url;
        } else {
          console.log(`❌ Format ${i + 1} failed:`, scraperResult.msg);
        }
      } catch (formatError) {
        console.log(`❌ Error with format ${i + 1}:`, formatError);
      }
      
      // Add delay between attempts to avoid rate limiting
      if (i < urlFormats.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`❌ All URL formats failed for video ID ${videoId}`);
    // Cache the failed result to prevent retries
    scraperCache.set(videoId, null);
    console.log(`💾 Cached failed result for video ${videoId}`);
    return null;
    
  } catch (error) {
    console.log(`❌ Error in tryExtractVideoWithScraper:`, error);
    // Cache the error result to prevent retries
    scraperCache.set(videoId, null);
    return null;
  }
}

// Helper function to get ad preview thumbnail
async function fetchAdPreviewThumbnail(adId: string, accessToken: string): Promise<string | null> {
  try {
    const previewUrl = `https://graph.facebook.com/v22.0/${adId}/previews?ad_format=MOBILE_FEED_STANDARD&access_token=${accessToken}`;
    const previewResponse = await fetch(previewUrl);
    
    if (previewResponse.ok) {
      const previewData = await previewResponse.json();
      // The preview data contains an iframe with the ad preview
      // While we can't extract the actual image from the iframe, we know the ad has visual content
      if (previewData.data && previewData.data.length > 0) {
        console.log(`✅ Ad preview available for ad ${adId}`);
        return `https://graph.facebook.com/v22.0/${adId}/previews?ad_format=MOBILE_FEED_STANDARD&access_token=${accessToken}`;
      }
    }
  } catch (error) {
    console.warn(`Could not get preview for ad ${adId}:`, error);
  }
  return null;
}

// Helper function to get ad creative details with asset_feed_spec
async function fetchAdCreativeDetails(adId: string, accessToken: string): Promise<any> {
  try {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // First get the ad creative ID from the ad using the 'creative' field
    const url1 = `https://graph.facebook.com/v22.0/${adId}?fields=creative{id,name,title,body,image_url,video_id,thumbnail_url,object_story_spec,asset_feed_spec,image_hash}&access_token=${accessToken}`;
    console.log(`🔍 Step 1 URL: ${url1.replace(accessToken, 'REDACTED_TOKEN')}`);
    
    const adResponse = await fetch(url1, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!adResponse.ok) {
      const errorText = await adResponse.text();
      console.error(`❌ Failed to fetch ad creative for ad ${adId}`);
      console.error(`Status: ${adResponse.status} ${adResponse.statusText}`);
      console.error(`Headers:`, Object.fromEntries(adResponse.headers.entries()));
      console.error(`Response Body:`, errorText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(errorText);
        console.error(`Parsed Error:`, JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error(`Unable to parse error as JSON`);
      }
      
      return null;
    }
    
    const adData = await adResponse.json();
    console.log(`✅ Step 1 SUCCESS for ad ${adId}`);
    console.log(`Status: ${adResponse.status} ${adResponse.statusText}`);
    console.log(`Response:`, JSON.stringify(adData, null, 2));
    
    const creative = adData.creative;
    
    if (!creative) {
      console.warn(`No creative found for ad ${adId}`);
      return null;
    }
    
    console.log(`Found creative data for ad ${adId}:`, creative);
    
    // If we already have enough creative data, return it
    if (creative.asset_feed_spec || creative.object_story_spec || creative.image_url || creative.video_id) {
      console.log(`✅ Creative data retrieved directly for ad ${adId}`);
      return creative;
    }
    
    // If we need more details, fetch the full creative
    const adCreativeId = creative.id;
    if (!adCreativeId) {
      console.warn(`No creative ID found for ad ${adId}`);
      return creative; // Return what we have
    }
    
    console.log(`Fetching additional creative details for creative ${adCreativeId}`);
    
    // Add another delay before the second request
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
    
    // Now fetch the full ad creative details with asset_feed_spec and full-size images
    const url2 = `https://graph.facebook.com/v22.0/${adCreativeId}?fields=asset_feed_spec,object_story_spec,image_url,video_id,image_hash,title,body,thumbnail_url&access_token=${accessToken}`;
    console.log(`🔍 Step 2 URL: ${url2.replace(accessToken, 'REDACTED_TOKEN')}`);
    
    const creativeResponse = await fetch(url2, {
      signal: controller2.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)'
      }
    });
    
    clearTimeout(timeoutId2);
    
    if (!creativeResponse.ok) {
      const errorText = await creativeResponse.text();
      console.error(`❌ Failed to fetch creative details for ${adCreativeId}`);
      console.error(`Status: ${creativeResponse.status} ${creativeResponse.statusText}`);
      console.error(`Headers:`, Object.fromEntries(creativeResponse.headers.entries()));
      console.error(`Response Body:`, errorText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(errorText);
        console.error(`Parsed Error:`, JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error(`Unable to parse error as JSON`);
      }
      
      // Return the basic creative data we already have
      return creative;
    }
    
    const creativeData = await creativeResponse.json();
    console.log(`✅ Step 2 SUCCESS for creative ${adCreativeId}`);
    console.log(`Status: ${creativeResponse.status} ${creativeResponse.statusText}`);
    console.log(`Response:`, JSON.stringify(creativeData, null, 2));
    
    // Merge the creative data with what we already have
    const mergedCreative = { ...creative, ...creativeData };
    
    // Ensure the creative ID is included in the response
    mergedCreative.id = adCreativeId;
    
    // If we still don't have a thumbnail_url but have other asset info, try to get ad preview for thumbnail
    if (!mergedCreative.thumbnail_url && (mergedCreative.video_id || mergedCreative.image_url || mergedCreative.image_hash)) {
      console.log(`Attempting to get ad preview for thumbnail for ad ${adId}`);
      const previewThumbnail = await fetchAdPreviewThumbnail(adId, accessToken);
      if (previewThumbnail) {
        mergedCreative.preview_thumbnail_url = previewThumbnail;
      }
    }
    
    return mergedCreative;
    
  } catch (error) {
    console.error(`❌ ERROR in fetchAdCreativeDetails for ad ${adId}:`, error);
    return null;
  }
}

// Helper function to find the best asset from asset_feed_spec - following Meta's exact structure
function findBestAssetFromFeedSpec(assetFeedSpec: any): { assetId: string; type: 'video' | 'image'; placement?: string } | null {
  if (!assetFeedSpec) {
    console.log('No asset_feed_spec found');
    return null;
  }
  
  console.log('Parsing asset_feed_spec with videos:', assetFeedSpec.videos?.length || 0, 'images:', assetFeedSpec.images?.length || 0);
  console.log('Asset customization rules:', assetFeedSpec.asset_customization_rules?.length || 0);
  
  // Priority order for placements - prefer Story/Reels (9x16) assets
  const placementPriority = [
    { platform: 'instagram', positions: ['story'] },
    { platform: 'facebook', positions: ['story'] },
    { platform: 'instagram', positions: ['reels'] },
    { platform: 'facebook', positions: ['reels'] },
    { platform: 'instagram', positions: ['feed'] },
    { platform: 'facebook', positions: ['feed'] }
  ];
  
  // Check asset_customization_rules for placement-specific assets
  if (assetFeedSpec.asset_customization_rules && assetFeedSpec.asset_customization_rules.length > 0) {
    console.log('Checking asset_customization_rules for placement-specific assets');
    
    for (const placement of placementPriority) {
      for (const rule of assetFeedSpec.asset_customization_rules) {
        const spec = rule.customization_spec;
        
        // Check if this rule matches our target placement
        if (spec?.publisher_platform === placement.platform) {
          const positionsField = placement.platform === 'instagram' ? 'instagram_positions' : 'facebook_positions';
          const positions = spec[positionsField];
          
          if (positions && positions.some((pos: string) => placement.positions.includes(pos))) {
            console.log(`Found matching rule for ${placement.platform} ${placement.positions[0]}`);
            
            // Found a matching rule - get the asset
            if (rule.video_label?.video_id) {
              console.log(`Found video asset: ${rule.video_label.video_id} for ${placement.platform}_${placement.positions[0]}`);
              return {
                assetId: rule.video_label.video_id,
                type: 'video',
                placement: `${placement.platform}_${placement.positions[0]}`
              };
            }
            
            if (rule.image_label?.hash) {
              console.log(`Found image asset: ${rule.image_label.hash} for ${placement.platform}_${placement.positions[0]}`);
              return {
                assetId: rule.image_label.hash,
                type: 'image',
                placement: `${placement.platform}_${placement.positions[0]}`
              };
            }
          }
        }
      }
    }
  }
  
  // Fallback: use the first asset from the general lists
  if (assetFeedSpec.videos && assetFeedSpec.videos.length > 0) {
    const firstVideo = assetFeedSpec.videos[0];
    if (firstVideo.video_id) {
      return {
        assetId: firstVideo.video_id,
        type: 'video',
        placement: 'general'
      };
    }
  }
  
  if (assetFeedSpec.images && assetFeedSpec.images.length > 0) {
    const firstImage = assetFeedSpec.images[0];
    if (firstImage.hash) {
      return {
        assetId: firstImage.hash,
        type: 'image',
        placement: 'general'
      };
    }
  }
  
  return null;
}

async function extractAssetUrl(
  creative: any, 
  adId: string, 
  accessToken: string,
  supabase: any,
  brandId: string,
  onesheetId: string,
  adAccountId: string
): Promise<{ url: string; type: string; localUrl?: string; placement?: string }> {
  console.log(`\n🎯 Starting asset extraction for ad ${adId}`);
  
  // Step 1: Get proper ad creative details with asset_feed_spec
  const adCreativeDetails = await fetchAdCreativeDetails(adId, accessToken);
  
  if (adCreativeDetails?.asset_feed_spec) {
    console.log(`📋 Found asset_feed_spec for ad ${adId}`);
    
    // Step 2: Find the best asset using placement rules
    const bestAsset = findBestAssetFromFeedSpec(adCreativeDetails.asset_feed_spec);
    
    if (bestAsset) {
      console.log(`🎯 Found ${bestAsset.type} asset ${bestAsset.assetId} for placement: ${bestAsset.placement}`);
      
      let downloadUrl: string | null = null;
      
      // Step 3: Get the downloadable URL based on asset type
      if (bestAsset.type === 'video') {
        downloadUrl = await fetchVideoUrl(bestAsset.assetId, accessToken, brandId, supabase);
      } else if (bestAsset.type === 'image') {
        // Use the proper ad account method for images
        downloadUrl = await fetchImageUrlFromAdAccount(bestAsset.assetId, adAccountId, accessToken);
        
        // Fallback to generic method if ad account method fails
        if (!downloadUrl) {
          downloadUrl = await fetchImageUrl(bestAsset.assetId, accessToken);
        }
      }
      
      if (downloadUrl) {
        console.log(`📥 Successfully got download URL for ${bestAsset.type} ${bestAsset.assetId}`);
        
        // Step 4: Download and store the asset
        const localUrl = await downloadAndStoreAsset(
          downloadUrl,
          bestAsset.assetId,
          bestAsset.type,
          supabase,
          brandId,
          onesheetId,
          adId
        );
        
        return {
          url: downloadUrl,
          type: bestAsset.type,
          localUrl: localUrl || undefined,
          placement: bestAsset.placement
        };
      }
    }
  }
  
  console.log(`⚠️ Falling back to legacy creative fields for ad ${adId}`);
  
  // Fallback to legacy creative structure
  if (adCreativeDetails) {
    // Direct video_id in creative
    if (adCreativeDetails.video_id) {
      const videoUrl = await fetchVideoUrl(adCreativeDetails.video_id, accessToken, brandId, supabase);
      if (videoUrl) {
        const localUrl = await downloadAndStoreAsset(
          videoUrl,
          adCreativeDetails.video_id,
          'video',
          supabase,
          brandId,
          onesheetId,
          adId
        );
        
        return {
          url: videoUrl,
          type: 'video',
          localUrl: localUrl || undefined,
          placement: 'legacy'
        };
      }
    }
    
    // Direct image_url in creative
    if (adCreativeDetails.image_url) {
      const localUrl = await downloadAndStoreAsset(
        adCreativeDetails.image_url,
        adCreativeDetails.image_hash || `img_${adId}`,
        'image',
        supabase,
        brandId,
        onesheetId,
        adId
      );
      
      return {
        url: adCreativeDetails.image_url,
        type: 'image',
        localUrl: localUrl || undefined,
        placement: 'legacy'
      };
    }
    
    // Image hash in creative
    if (adCreativeDetails.image_hash) {
      const imageUrl = await fetchImageUrlFromAdAccount(adCreativeDetails.image_hash, adAccountId, accessToken);
      
      if (imageUrl) {
        const localUrl = await downloadAndStoreAsset(
          imageUrl,
          adCreativeDetails.image_hash,
          'image',
          supabase,
          brandId,
          onesheetId,
          adId
        );
        
        return {
          url: imageUrl,
          type: 'image',
          localUrl: localUrl || undefined,
          placement: 'legacy'
        };
      }
    }
  }
  
  // Final fallback to original creative object passed in
  return await extractLegacyAssetUrl(creative, adId, accessToken, supabase, brandId, onesheetId, adAccountId);
}

// Keep the old extraction logic as a final fallback
async function extractLegacyAssetUrl(
  creative: any, 
  adId: string, 
  accessToken: string,
  supabase: any,
  brandId: string,
  onesheetId: string,
  adAccountId: string
): Promise<{ url: string; type: string; localUrl?: string; placement?: string }> {
  console.log(`🔄 Using legacy asset extraction for ad ${adId}`);
  
  // Check for video first
  if (creative.video_id) {
    const videoUrl = await fetchVideoUrl(creative.video_id, accessToken, brandId, supabase);
    
    if (videoUrl) {
      const localUrl = await downloadAndStoreAsset(
        videoUrl, 
        creative.video_id, 
        'video',
        supabase,
        brandId,
        onesheetId,
        adId
      );
      
      return { 
        url: videoUrl, 
        type: 'video',
        localUrl: localUrl || undefined,
        placement: 'fallback'
      };
    }
    
    if (creative.thumbnail_url) {
      return { url: creative.thumbnail_url, type: 'video', placement: 'fallback' };
    }
    
    return { 
      url: `https://graph.facebook.com/v22.0/${creative.video_id}/picture?access_token=${accessToken}`, 
      type: 'video',
      placement: 'fallback'
    };
  }
  
  // Check for direct image URL
  if (creative.image_url) {
    const localUrl = await downloadAndStoreAsset(
      creative.image_url,
      creative.image_hash || `img_${adId}`,
      'image',
      supabase,
      brandId,
      onesheetId,
      adId
    );
    
    return { 
      url: creative.image_url, 
      type: 'image',
      localUrl: localUrl || undefined,
      placement: 'fallback'
    };
  }
  
  // Check image hash
  if (creative.image_hash) {
    const imageUrl = await fetchImageUrlFromAdAccount(creative.image_hash, adAccountId, accessToken);
    
    if (imageUrl) {
      const localUrl = await downloadAndStoreAsset(
        imageUrl,
        creative.image_hash,
        'image',
        supabase,
        brandId,
        onesheetId,
        adId
      );
      
      return { 
        url: imageUrl, 
        type: 'image',
        localUrl: localUrl || undefined,
        placement: 'fallback'
      };
    }
  }
  
  return { url: '', type: 'unknown', placement: 'none' };
}

function extractAdName(ad: any): string {
  // Priority order for ad name extraction
  
  // 1. Ad name itself
  if (ad.name && ad.name.trim()) {
    return ad.name.trim();
  }
  
  // 2. Creative name
  if (ad.creative?.name && ad.creative.name.trim()) {
    return ad.creative.name.trim();
  }
  
  // 3. Creative title
  if (ad.creative?.title && ad.creative.title.trim()) {
    return ad.creative.title.trim();
  }
  
  // 4. Object story spec content
  const objectStorySpec = ad.creative?.object_story_spec || {};
  
  // Check video_data
  if (objectStorySpec.video_data?.title) {
    return objectStorySpec.video_data.title.trim();
  }
  
  // Check link_data
  if (objectStorySpec.link_data?.name) {
    return objectStorySpec.link_data.name.trim();
  }
  
  if (objectStorySpec.link_data?.message) {
    return objectStorySpec.link_data.message.trim();
  }
  
  // 5. Creative body (first 50 chars)
  if (ad.creative?.body && ad.creative.body.trim()) {
    const body = ad.creative.body.trim();
    return body.length > 50 ? body.substring(0, 50) + '...' : body;
  }
  
  // 6. Campaign or adset name as fallback
  if (ad.campaign?.name && ad.campaign.name.trim()) {
    return `Campaign: ${ad.campaign.name.trim()}`;
  }
  
  if (ad.adset?.name && ad.adset.name.trim()) {
    return `AdSet: ${ad.adset.name.trim()}`;
  }
  
  // 7. Last resort - use ad ID
  return `Ad ${ad.id}`;
}

function extractLandingPageUrl(creative: any): string {
  const objectStorySpec = creative?.object_story_spec || {};
  
  // Check link_data first
  if (objectStorySpec.link_data?.link) {
    return objectStorySpec.link_data.link;
  }
  
  // Check video_data
  if (objectStorySpec.video_data?.call_to_action?.value?.link) {
    return objectStorySpec.video_data.call_to_action.value.link;
  }
  
  // Check asset_feed_spec
  if (creative.asset_feed_spec?.link_urls?.length > 0) {
    const firstLink = creative.asset_feed_spec.link_urls[0];
    if (firstLink.website_url) {
      return firstLink.website_url;
    }
  }
  
  return '';
}

// Process ads in batches to prevent overwhelming the Meta API and storage system
async function processAdsBatched(
  ads: any[],
  accessToken: string,
  supabase: any,
  brandId: string,
  onesheetId: string,
  adAccountId: string
): Promise<any[]> {
  const processedAds: any[] = [];
  const totalAds = ads.length;
  let errorCount = 0;
  const maxErrors = 20; // Stop asset downloads after too many errors
  let skipAssetDownloads = false;
  
  console.log(`Processing ${totalAds} ads in batches of ${BATCH_SIZE}`);
  
  // Process ads in smaller batches to avoid overwhelming the system
  for (let i = 0; i < ads.length; i += BATCH_SIZE) {
    const batch = ads.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ads.length / BATCH_SIZE)}`);
    
    // Check if we should skip asset downloads due to too many errors
    if (errorCount > maxErrors && !skipAssetDownloads) {
      console.warn(`⚠️ Too many errors (${errorCount}), skipping asset downloads for remaining ads`);
      skipAssetDownloads = true;
    }
    
    // Process each ad in the batch with limited concurrency
    const batchPromises = batch.map(async (ad, index) => {
      // Stagger the requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 500));
      
      const insights = ad.insights?.data?.[0] || {};
      const creative = ad.creative || {};
      
      // Extract enhanced ad name
      const adName = extractAdName(ad);
      
      // Extract landing page URL
      const landingPage = extractLandingPageUrl(creative);
      
      // Extract asset URL and type with downloading (this will handle its own rate limiting)
      let assetInfo;
      try {
        if (skipAssetDownloads) {
          // Just get basic asset info without downloading
          assetInfo = {
            url: creative.image_url || creative.thumbnail_url || '',
            type: creative.video_id ? 'video' : 'image',
            placement: 'skipped'
          };
        } else {
          assetInfo = await extractAssetUrl(creative, ad.id, accessToken, supabase, brandId, onesheetId, adAccountId);
        }
      } catch (error) {
        console.warn(`Failed to extract asset for ad ${ad.id}:`, error);
        assetInfo = { url: '', type: 'unknown', placement: 'error' };
        errorCount++;
      }
      
      // ENHANCED: Extract video ID from multiple sources for debug visibility
      let extractedVideoId: string | null = null;
      try {
        // First check the creative object (most common)
        if (creative.video_id) {
          extractedVideoId = creative.video_id;
          console.log(`🎥 Video ID from creative: ${extractedVideoId} (ad: ${ad.id})`);
        } else {
          // Try to get detailed creative info to find video ID
          const adCreativeDetails = await fetchAdCreativeDetails(ad.id, accessToken);
          if (adCreativeDetails?.video_id) {
            extractedVideoId = adCreativeDetails.video_id;
            console.log(`🎥 Video ID from adCreativeDetails: ${extractedVideoId} (ad: ${ad.id})`);
          } else if (adCreativeDetails?.asset_feed_spec?.videos?.length > 0) {
            // Check asset_feed_spec for video assets
            const firstVideo = adCreativeDetails.asset_feed_spec.videos[0];
            if (firstVideo.video_id) {
              extractedVideoId = firstVideo.video_id;
              console.log(`🎥 Video ID from asset_feed_spec: ${extractedVideoId} (ad: ${ad.id})`);
            }
          }
        }
      } catch (videoIdError) {
        console.warn(`Failed to extract video ID for ad ${ad.id}:`, videoIdError);
      }
      
      // Calculate metrics
      const spend = parseFloat(insights.spend || '0');
      const impressions = parseInt(insights.impressions || '0');
      
      // Calculate conversions (purchases)
      const purchases = insights.actions?.reduce((total: number, action: any) => {
        if (action.action_type === 'purchase' || 
            action.action_type === 'omni_purchase' ||
            action.action_type === 'offline_conversion.purchase') {
          return total + parseInt(action.value || '0');
        }
        return total;
      }, 0) || 0;
      
      // Calculate actual purchase revenue from action_values
      const purchaseRevenue = insights.action_values?.reduce((total: number, action: any) => {
        if (action.action_type === 'purchase' || 
            action.action_type === 'omni_purchase' ||
            action.action_type === 'offline_conversion.purchase') {
          return total + parseFloat(action.value || '0');
        }
        return total;
      }, 0) || 0;
      
      const cpa = purchases > 0 ? spend / purchases : (spend > 0 ? spend : 0);
      const roas = spend > 0 && purchaseRevenue > 0 ? purchaseRevenue / spend : 0; // Real ROAS calculation
      
      // Video metrics
      const videoPlays = parseInt(insights.video_play_actions?.[0]?.value || '0');
      const video3s = videoPlays; // Use video plays as proxy for 3-second views
      const video25 = parseInt(insights.video_p25_watched_actions?.[0]?.value || '0');
      const video50 = parseInt(insights.video_p50_watched_actions?.[0]?.value || '0');
      const video75 = parseInt(insights.video_p75_watched_actions?.[0]?.value || '0');
      const video100 = parseInt(insights.video_p100_watched_actions?.[0]?.value || '0');
      
      const hookRate = impressions > 0 ? (video3s / impressions) * 100 : 0;
      const holdRate = video3s > 0 ? (video50 / video3s) * 100 : 0;
      
      return {
        // Identifiers
        id: ad.id,
        name: adName,
        status: ad.status,
        
        // Asset info - use local URL if available, fallback to original URL
        assetUrl: assetInfo.localUrl || assetInfo.url,
        assetOriginalUrl: assetInfo.url, // Keep original URL for reference
        assetType: assetInfo.type,
        assetId: creative.video_id || creative.image_hash || creative.id || '',
        assetPlacement: assetInfo.placement || 'unknown', // Track which placement this asset is for
        
        // Landing page
        landingPage,
        
        // Performance metrics
        spend: spend.toFixed(2),
        impressions,
        cpa: cpa.toFixed(2),
        roas: roas.toFixed(2),
        purchaseRevenue: purchaseRevenue.toFixed(2),
        hookRate: hookRate.toFixed(1),
        holdRate: holdRate.toFixed(1),
        
        // Raw metrics for calculations
        purchases,
        video3s,
        video25,
        video50,
        video75,
        video100,
        
        // Campaign/AdSet info
        campaignName: ad.campaign?.name || '',
        adsetName: ad.adset?.name || '',
        
        // Creative details (for later Gemini analysis)
        creativeTitle: creative.title || '',
        creativeBody: creative.body || '',
        
        // Creative preview URLs
        thumbnailUrl: creative.thumbnail_url || null,
        imageUrl: creative.image_url || null,
        videoId: extractedVideoId || creative.video_id || null, // Use enhanced extracted video ID first
        
        // Placeholder fields for Gemini analysis (Phase 2)
        type: null,
        adDuration: null,
        productIntro: null,
        sitInProblem: null,
        creatorsUsed: null,
        angle: null,
        format: null,
        emotion: null,
        framework: null,
        transcription: null
      };
    });
    
    // Wait for the batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Extract successful results and log failures
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        processedAds.push(result.value);
      } else {
        console.warn(`Failed to process ad in batch ${Math.floor(i / BATCH_SIZE) + 1}, index ${index}:`, result.reason);
        // Add a placeholder for failed ads to maintain count
        const failedAd = batch[index];
        processedAds.push({
          id: failedAd?.id || 'unknown',
          name: 'Processing Failed',
          status: 'error',
          assetUrl: '',
          assetType: 'error',
          error: 'Processing failed',
          // Still try to get video ID even if processing failed
          videoId: failedAd?.creative?.video_id || null
        });
      }
    });
    
    // Delay between batches to avoid overwhelming the API
    if (i + BATCH_SIZE < ads.length) {
      console.log(`Batch complete. Waiting ${ASSET_DOWNLOAD_DELAY}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, ASSET_DOWNLOAD_DELAY));
    }
  }
  
  console.log(`Completed processing ${processedAds.length} ads`);
  return processedAds;
}

export async function POST(request: NextRequest) {
  const supabase = await createSSRClient();
  const requestId = uuidv4().slice(0, 8);
  
  console.log(`[Ad Audit Import ${requestId}] Starting import request`);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { onesheet_id, date_range, max_ads = 500 } = body;

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // Validate max_ads limit (prevent abuse)
    const maxAdsLimit = Math.min(Math.max(max_ads, 10), 1000); // Between 10 and 1000

    // Get OneSheet and brand info
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('id, brand_id, ad_account_audit, stages_completed')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      console.error(`[Ad Audit Import ${requestId}] OneSheet not found:`, onesheetError);
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Get brand with Meta credentials
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_ad_account_id, meta_default_ad_account_id, meta_ad_accounts')
      .eq('id', onesheet.brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      console.error(`[Ad Audit Import ${requestId}] Brand not found:`, brandError);
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check Meta integration
    if (!brand.meta_access_token) {
      return NextResponse.json({ error: 'Meta integration not configured' }, { status: 400 });
    }

    // Determine which ad account to use
    let adAccountId = brand.meta_default_ad_account_id || brand.meta_ad_account_id;
    if (!adAccountId) {
      return NextResponse.json({ error: 'No Meta ad account configured' }, { status: 400 });
    }
    
    // Remove 'act_' prefix if it exists (we'll add it back in the URL)
    if (adAccountId.startsWith('act_')) {
      adAccountId = adAccountId.substring(4);
    }
    
    console.log(`[Ad Audit Import ${requestId}] Using ad account ID: ${adAccountId}`);

    // Decrypt access token
    const accessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv,
      authTag: brand.meta_access_token_auth_tag
    });

    // Set date range (default to last 30 days)
    const endDate = date_range?.end || new Date().toISOString().split('T')[0];
    const startDate = date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[Ad Audit Import ${requestId}] Fetching ads from ${startDate} to ${endDate}, max ${maxAdsLimit} ads`);

    // Use date_preset for better performance when possible
    let timeParam: string;
    const daysDiff = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 7) {
      timeParam = 'date_preset=last_7d';
    } else if (daysDiff === 30) {
      timeParam = 'date_preset=last_30d';
    } else if (daysDiff === 90) {
      timeParam = 'date_preset=last_90d';
    } else {
      timeParam = `time_range=${JSON.stringify({ since: startDate, until: endDate })}`;
    }

    // Fetch ads using tiered approach
    const allAds = await fetchAllAds(adAccountId, accessToken, date_range, maxAdsLimit);

    console.log(`Total ads fetched with tiered approach: ${allAds.length}`);

    // Process ads into spreadsheet format using batch processing
    console.log(`[Ad Audit Import ${requestId}] Processing ${allAds.length} ads with batch processing`);
    const processedAds = await processAdsBatched(
      allAds,
      accessToken,
      supabase,
      onesheet.brand_id,
      onesheet_id,
      adAccountId
    );

    // Update OneSheet with the processed data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        ad_account_audit: {
          ads: processedAds,
          demographicBreakdown: { age: {}, gender: {} },
          lastImported: new Date().toISOString(),
          dateRange: date_range,
          totalAdsImported: processedAds.length,
          importMethod: 'tiered_spending'
        },
        stages_completed: {
          ...(onesheet.stages_completed as Record<string, any> || {}),
          ad_audit: true
        }
      })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Error updating onesheet:', updateError);
      return NextResponse.json({ error: 'Failed to save audit data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        adsImported: processedAds.length,
        dateRange: date_range,
        importMethod: 'tiered_spending',
        summary: {
          totalSpend: processedAds.reduce((sum, ad) => sum + parseFloat(ad.spend), 0).toFixed(2),
          totalPurchaseRevenue: processedAds.reduce((sum, ad) => sum + parseFloat(ad.purchaseRevenue || '0'), 0).toFixed(2),
          totalImpressions: processedAds.reduce((sum, ad) => sum + ad.impressions, 0),
          totalPurchases: processedAds.reduce((sum, ad) => sum + ad.purchases, 0),
          averageCPA: processedAds.reduce((sum, ad) => sum + parseFloat(ad.cpa), 0) / processedAds.length || 0,
          averageROAS: processedAds.reduce((sum, ad) => sum + parseFloat(ad.roas), 0) / processedAds.length || 0,
          averageHookRate: processedAds.reduce((sum, ad) => sum + parseFloat(ad.hookRate), 0) / processedAds.length || 0,
          averageHoldRate: processedAds.reduce((sum, ad) => sum + parseFloat(ad.holdRate), 0) / processedAds.length || 0,
          highestSpend: Math.max(...processedAds.map(ad => parseFloat(ad.spend))),
          lowestSpend: Math.min(...processedAds.map(ad => parseFloat(ad.spend)))
        }
      }
    });

  } catch (error) {
    console.error('Error in ad audit import:', error);
    return NextResponse.json(
      { error: 'Failed to import ad data' },
      { status: 500 }
    );
  }
} 