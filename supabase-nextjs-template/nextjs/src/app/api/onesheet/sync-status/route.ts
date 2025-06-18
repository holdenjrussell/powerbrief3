import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[OneSheet Status ${requestId}] Starting status check request`);
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[OneSheet Status ${requestId}] Authentication failed:`, authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[OneSheet Status ${requestId}] Authenticated user: ${user.id}`);

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    console.log(`[OneSheet Status ${requestId}] Request params:`, {
      jobId,
      userId: user.id
    });

    if (!jobId) {
      console.log(`[OneSheet Status ${requestId}] Missing jobId parameter`);
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get sync job status
    console.log(`[OneSheet Status ${requestId}] Fetching sync job: ${jobId}`);
    const { data: syncJob, error: jobError } = await supabase
      .from('onesheet_sync_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.log(`[OneSheet Status ${requestId}] Sync job fetch error:`, jobError.message);
      return NextResponse.json({ error: 'Sync job not found' }, { status: 404 });
    }

    console.log(`[OneSheet Status ${requestId}] Sync job found:`, {
      jobId: syncJob.id,
      status: syncJob.status,
      totalAds: syncJob.total_ads,
      processedAds: syncJob.processed_ads,
      brandId: syncJob.brand_id,
      onesheetId: syncJob.onesheet_id,
      startedAt: syncJob.started_at,
      completedAt: syncJob.completed_at,
      hasError: !!syncJob.error_message
    });

    // Calculate progress percentage
    const progress = syncJob.total_ads > 0 
      ? Math.round((syncJob.processed_ads / syncJob.total_ads) * 100)
      : 0;

    console.log(`[OneSheet Status ${requestId}] Progress calculated: ${progress}%`);

    const response = {
      id: syncJob.id,
      status: syncJob.status,
      progress,
      totalAds: syncJob.total_ads,
      processedAds: syncJob.processed_ads,
      errorMessage: syncJob.error_message,
      startedAt: syncJob.started_at,
      completedAt: syncJob.completed_at,
      dateRange: {
        start: syncJob.date_range_start,
        end: syncJob.date_range_end
      }
    };

    console.log(`[OneSheet Status ${requestId}] Returning status response:`, {
      status: response.status,
      progress: response.progress,
      totalAds: response.totalAds,
      processedAds: response.processedAds,
      hasError: !!response.errorMessage
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error(`[OneSheet Status ${requestId}] Error checking sync status:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 