import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { scrapeFacebook } from '@/lib/social-media-scrapers';

async function downloadAndStoreAsset(
  url: string,
  assetId: string,
  type: 'video' | 'image',
  supabase: any,
  brandId: string,
  onesheetId: string,
  adId: string
): Promise<string | null> {
  try {
    // Check if asset already exists
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

    console.log(`Downloading ${type} asset: ${assetId}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0)',
        'Accept': type === 'video' ? 'video/*' : 'image/*'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to download asset ${assetId}:`, response.status, response.statusText);
      return null;
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
    const { error } = await supabase.storage
      .from('onesheet-assets')
      .upload(fileName, buffer, {
        contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.warn(`Failed to upload asset ${assetId} to storage:`, error);
      return null;
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
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Error downloading/storing asset ${assetId}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { ads, onesheetId, brandId } = await request.json();

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: 'No ads provided' }, { status: 400 });
    }

    if (!onesheetId || !brandId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get brand's Facebook page configuration
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_facebook_pages, meta_manual_page_labels, meta_default_facebook_page_id, meta_facebook_page_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand config:', brandError);
      return NextResponse.json({ error: 'Failed to fetch brand configuration' }, { status: 500 });
    }

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
        const pageObj = page as { id?: string; name?: string };
        if (pageObj?.id) pageIds.add(pageObj.id);
        if (pageObj?.name) pageIds.add(pageObj.name); // For named pages
      }
    }
    
    // Add manual page labels
    if (brand.meta_manual_page_labels && typeof brand.meta_manual_page_labels === 'object') {
      const labels = brand.meta_manual_page_labels as Record<string, unknown>;
      Object.keys(labels).forEach(pageId => {
        pageIds.add(pageId);
      });
    }

    const brandPageIds = Array.from(pageIds);
    console.log(`Found ${brandPageIds.length} brand page IDs:`, brandPageIds);

    const rescrapedAds = [];
    let failedCount = 0;

    // Process each ad
    for (const ad of ads) {
      if (!ad.videoId) continue;

      try {
        console.log(`Rescraping video for ad ${ad.id} with video ID ${ad.videoId}`);
        
        // Try different URL formats that Facebook uses for videos
        const urlFormats = [
          `https://www.facebook.com/video.php?v=${ad.videoId}`,
          `https://www.facebook.com/watch/?v=${ad.videoId}`,
          `https://fb.watch/${ad.videoId}`,
          `https://www.facebook.com/videos/${ad.videoId}`
        ];
        
        // Add brand page-specific URLs
        for (const pageId of brandPageIds) {
          urlFormats.push(
            `https://www.facebook.com/${pageId}/videos/${ad.videoId}`,
            `https://www.facebook.com/${pageId}/posts/${ad.videoId}`
          );
        }

        let videoUrl = null;
        let scrapedSuccessfully = false;

        // Try each URL format
        for (const url of urlFormats) {
          console.log(`Trying URL format: ${url}`);
          
          try {
            const scraperResult = await scrapeFacebook(url);
            
            if (scraperResult.status === 200 && scraperResult.data?.type === 'video' && scraperResult.data.url) {
              videoUrl = scraperResult.data.url;
              scrapedSuccessfully = true;
              console.log(`Successfully scraped video URL: ${videoUrl}`);
              break;
            }
          } catch (error) {
            console.log(`Failed to scrape ${url}:`, error);
          }
        }

        if (scrapedSuccessfully && videoUrl) {
          // Download and store the video
          const localUrl = await downloadAndStoreAsset(
            videoUrl,
            ad.videoId,
            'video',
            supabase,
            brandId,
            onesheetId,
            ad.id
          );

          if (localUrl) {
            // Update the ad record with the new asset URL
            const { data: onesheet } = await supabase
              .from('onesheet')
              .select('ad_account_audit')
              .eq('id', onesheetId)
              .single();

            if (onesheet?.ad_account_audit) {
              const auditData = onesheet.ad_account_audit as { ads?: any[] };
              if (auditData.ads) {
                const updatedAds = auditData.ads.map((storedAd: any) => {
                  if (storedAd.id === ad.id) {
                    return {
                      ...storedAd,
                      assetUrl: localUrl,
                      assetLoadFailed: false,
                      manuallyUploaded: false
                    };
                  }
                  return storedAd;
                });

                await supabase
                  .from('onesheet')
                  .update({
                    ad_account_audit: {
                      ...(onesheet.ad_account_audit as Record<string, unknown>),
                      ads: updatedAds
                    }
                  })
                  .eq('id', onesheetId);

                rescrapedAds.push({
                  ...ad,
                  assetUrl: localUrl,
                  assetLoadFailed: false
                });
              }
            }
          } else {
            failedCount++;
            console.error(`Failed to download/store video for ad ${ad.id}`);
          }
        } else {
          failedCount++;
          console.error(`Failed to scrape video URL for ad ${ad.id}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error processing ad ${ad.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      rescrapedCount: rescrapedAds.length,
      failedCount,
      rescrapedAds
    });

  } catch (error) {
    console.error('Error in rescrape-videos route:', error);
    return NextResponse.json(
      { error: 'Failed to rescrape videos' },
      { status: 500 }
    );
  }
} 