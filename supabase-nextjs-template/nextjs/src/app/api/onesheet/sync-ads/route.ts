import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[OneSheet Sync ${requestId}] Starting sync request`);
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[OneSheet Sync ${requestId}] Authentication failed:`, authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[OneSheet Sync ${requestId}] Authenticated user: ${user.id}`);

    const body = await request.json();
    const { brandId, onesheetId, dateRange } = body;

    console.log(`[OneSheet Sync ${requestId}] Request body:`, {
      brandId,
      onesheetId,
      dateRange,
      userId: user.id
    });

    if (!brandId || !onesheetId) {
      console.log(`[OneSheet Sync ${requestId}] Missing required parameters`);
      return NextResponse.json({ error: 'Brand ID and OneSheet ID are required' }, { status: 400 });
    }

    // Get brand's Meta credentials
    console.log(`[OneSheet Sync ${requestId}] Fetching brand credentials for brandId: ${brandId}`);
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_ad_account_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.log(`[OneSheet Sync ${requestId}] Brand fetch error:`, brandError?.message);
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    console.log(`[OneSheet Sync ${requestId}] Brand found. Ad Account ID: ${brand.meta_ad_account_id}`);

    if (!brand.meta_access_token || !brand.meta_ad_account_id) {
      console.log(`[OneSheet Sync ${requestId}] Meta integration not configured:`, {
        hasAccessToken: !!brand.meta_access_token,
        hasAdAccountId: !!brand.meta_ad_account_id
      });
      return NextResponse.json({ error: 'Meta integration not configured for this brand' }, { status: 400 });
    }

    // Decrypt access token
    console.log(`[OneSheet Sync ${requestId}] Decrypting access token`);
    const accessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv!,
      authTag: brand.meta_access_token_auth_tag!
    });

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'last30':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last90':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'last180':
        startDate.setDate(endDate.getDate() - 180);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Reasonable default for "all time"
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    console.log(`[OneSheet Sync ${requestId}] Date range calculated:`, {
      dateRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Create a sync job record
    console.log(`[OneSheet Sync ${requestId}] Creating sync job record`);
    const { data: syncJob, error: syncError } = await supabase
      .from('onesheet_sync_jobs')
      .insert({
        onesheet_id: onesheetId,
        brand_id: brandId,
        status: 'pending',
        date_range_start: startDate.toISOString(),
        date_range_end: endDate.toISOString(),
        total_ads: 0,
        processed_ads: 0,
        created_by: user.id
      })
      .select()
      .single();

    if (syncError) {
      console.error(`[OneSheet Sync ${requestId}] Failed to create sync job:`, syncError);
      return NextResponse.json({ error: 'Failed to start sync job' }, { status: 500 });
    }

    console.log(`[OneSheet Sync ${requestId}] Sync job created successfully:`, {
      jobId: syncJob.id,
      status: syncJob.status
    });

    // Start the async sync process
    console.log(`[OneSheet Sync ${requestId}] Starting async sync process`);
    startAsyncSync(syncJob.id, brand.meta_ad_account_id, accessToken, startDate, endDate, onesheetId, requestId);

    return NextResponse.json({
      success: true,
      jobId: syncJob.id,
      message: 'Sync job started successfully'
    });

  } catch (error) {
    console.error(`[OneSheet Sync ${requestId}] Error in sync ads API:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This would be moved to a background job handler in production
async function startAsyncSync(
  jobId: string,
  adAccountId: string,
  accessToken: string,
  startDate: Date,
  endDate: Date,
  onesheetId: string,
  requestId: string
) {
  console.log(`[OneSheet Sync ${requestId}] Starting async sync for job: ${jobId}`);
  
  try {
    const supabase = await createClient();
    
    // Update job status to processing
    console.log(`[OneSheet Sync ${requestId}] Updating job status to processing`);
    await supabase
      .from('onesheet_sync_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    // Fetch ads from Meta API
    const fields = [
      'id',
      'name',
      'status',
      'created_time',
      'updated_time',
      'adset_id',
      'campaign_id',
      'creative{id,name,body,thumbnail_url,video_id,image_url,effective_object_story_spec}',
      'insights{spend,impressions,clicks,ctr,cpc,cpm,cpp,actions,video_3_sec_watched_actions,video_p100_watched_actions}'
    ].join(',');

    const timeRange = `{'since':'${startDate.toISOString().split('T')[0]}','until':'${endDate.toISOString().split('T')[0]}'}`;
    
    const metaApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/ads?` +
      `fields=${fields}&` +
      `time_range=${timeRange}&` +
      `limit=100&` +
      `access_token=${accessToken}`;

    console.log(`[OneSheet Sync ${requestId}] Meta API request:`, {
      adAccountId,
      timeRange,
      fieldsCount: fields.split(',').length,
      url: metaApiUrl.replace(accessToken, '[REDACTED]')
    });

    // This is a simplified version - in production, handle pagination
    const response = await fetch(metaApiUrl);
    const data = await response.json();

    console.log(`[OneSheet Sync ${requestId}] Meta API response:`, {
      status: response.status,
      ok: response.ok,
      hasError: !!data.error,
      adsCount: data.data?.length || 0
    });

    if (!response.ok || data.error) {
      console.error(`[OneSheet Sync ${requestId}] Meta API error:`, data.error);
      throw new Error(data.error?.message || 'Failed to fetch ads from Meta');
    }

    const ads = data.data || [];
    console.log(`[OneSheet Sync ${requestId}] Processing ${ads.length} ads`);
    
    // Update total ads count
    await supabase
      .from('onesheet_sync_jobs')
      .update({ total_ads: ads.length })
      .eq('id', jobId);

    // Process each ad
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      console.log(`[OneSheet Sync ${requestId}] Processing ad ${i + 1}/${ads.length}: ${ad.id}`);
      
      // Store ad data in the onesheet's ad_performance_data
      const { data: onesheet } = await supabase
        .from('onesheet')
        .select('ad_performance_data')
        .eq('id', onesheetId)
        .single();

      const currentData = onesheet?.ad_performance_data || [];
      
      // Calculate metrics
      const insights = ad.insights?.data?.[0] || {};
      const spend = parseFloat(insights.spend || '0');
      const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const cpa = conversions > 0 ? spend / conversions : 0;
      const impressions = parseInt(insights.impressions || '0');
      const video3SecWatched = parseInt(insights.video_3_sec_watched_actions?.value || '0');
      const videoPComplete = parseInt(insights.video_p100_watched_actions?.value || '0');
      
      const hookRate = impressions > 0 ? (video3SecWatched / impressions) * 100 : 0;
      const holdRate = impressions > 0 ? (videoPComplete / impressions) * 100 : 0;

      console.log(`[OneSheet Sync ${requestId}] Ad ${ad.id} metrics:`, {
        spend,
        cpa,
        impressions,
        hookRate: hookRate.toFixed(2),
        holdRate: holdRate.toFixed(2),
        hasVideo: !!ad.creative?.video_id,
        hasImage: !!ad.creative?.image_url
      });

      const adData = {
        id: ad.id,
        adLink: `https://facebook.com/ads/library/?id=${ad.id}`,
        landingPage: ad.creative?.effective_object_story_spec?.link_data?.link || '',
        spend,
        cpa,
        hookRate,
        holdRate,
        angle: '', // Will be filled by AI
        format: '', // Will be filled by AI
        emotion: '', // Will be filled by AI
        framework: '', // Will be filled by AI
        dateRange: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        // Store additional data for AI processing
        creative: ad.creative,
        name: ad.name,
        status: ad.status
      };

      // Update onesheet with new ad data
      await supabase
        .from('onesheet')
        .update({
          ad_performance_data: [...currentData, adData]
        })
        .eq('id', onesheetId);

      // Update processed count
      await supabase
        .from('onesheet_sync_jobs')
        .update({ processed_ads: i + 1 })
        .eq('id', jobId);

      console.log(`[OneSheet Sync ${requestId}] Ad ${ad.id} processed successfully. Progress: ${i + 1}/${ads.length}`);
    }

    // Mark job as completed
    console.log(`[OneSheet Sync ${requestId}] Marking job as completed`);
    await supabase
      .from('onesheet_sync_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[OneSheet Sync ${requestId}] Sync completed successfully. Total ads processed: ${ads.length}`);

  } catch (error) {
    console.error(`[OneSheet Sync ${requestId}] Sync job failed:`, error);
    
    // Mark job as failed
    const supabase = await createClient();
    await supabase
      .from('onesheet_sync_jobs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[OneSheet Sync ${requestId}] Job marked as failed`);
  }
} 