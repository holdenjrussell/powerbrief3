import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const teamId = searchParams.get('teamId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('scorecard_data')
      .select(`
        *,
        scorecard_metrics!inner(
          id,
          brand_id,
          team_id,
          metric_key,
          display_name
        )
      `)
      .eq('scorecard_metrics.brand_id', brandId)
      .order('period_start', { ascending: false });

    if (teamId) {
      query = query.eq('scorecard_metrics.team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Scorecard Data] Error fetching data:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[Scorecard Data] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 