export const dynamic = 'force-dynamic'; // Ensures dynamic handling for cookies

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NewMetric } from '@/app/app/scorecard/page'; // Assuming NewMetric is exported from the page
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const getSupabaseClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand_id, team_id, metric_key, display_name, goal_value, goal_operator, meta_campaigns } = body;

    if (!brand_id || !metric_key || !display_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert metric
    const { data: metric, error } = await supabase
      .from('scorecard_metrics')
      .insert({
        brand_id,
        team_id,
        metric_key,
        display_name,
        goal_value,
        goal_operator,
        meta_campaigns
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating metric:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Error in POST /api/scorecard/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    const teamId = searchParams.get('teamId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('scorecard_metrics')
      .select('*')
      .eq('brand_id', brandId);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: metrics, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching metrics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metrics: metrics || [] });
  } catch (error) {
    console.error('Error in GET /api/scorecard/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, metric_key, display_name, goal_value, goal_operator, meta_campaigns } = body;

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Update metric
    const { data: metric, error } = await supabase
      .from('scorecard_metrics')
      .update({
        metric_key,
        display_name,
        goal_value,
        goal_operator,
        meta_campaigns,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating metric:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metric });
  } catch (error) {
    console.error('Error in PUT /api/scorecard/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete metric (this will cascade delete related scorecard_data)
    const { error } = await supabase
      .from('scorecard_metrics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting metric:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/scorecard/metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
