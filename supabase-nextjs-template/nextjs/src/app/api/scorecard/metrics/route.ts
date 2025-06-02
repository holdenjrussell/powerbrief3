export const dynamic = 'force-dynamic'; // Ensures dynamic handling for cookies

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NewMetric } from '@/app/app/scorecard/page'; // Assuming NewMetric is exported from the page

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

export async function POST(request: Request) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metricData: NewMetric = await request.json();

    // Basic validation (can be expanded)
    if (!metricData || !metricData.title) {
        return NextResponse.json({ error: 'Metric title is required' }, { status: 400 });
    }
    if (!metricData.id) { // Assign a new ID if it's a new metric
        metricData.id = crypto.randomUUID();
    }

    const { data, error } = await supabase
      .from('scorecard_metrics') // Ensure this table exists in your Supabase
      .upsert({
        id: metricData.id,
        user_id: user.id,
        metric_config: metricData, // Storing the whole NewMetric object
        // brand_id: metricData.brandId, // Optional: if you link metrics to brands
        updated_at: new Date().toISOString(), // Keep track of updates
      })
      .select();

    if (error) {
      console.error('Supabase error saving metric:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data?.[0]?.metric_config || {}, { status: 201 }); // Return the saved metric_config
  } catch (err) {
    console.error('Error processing POST request for metrics:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() { // Removed unused _request parameter
  const supabase = await getSupabaseClient();
  // Removed @ts-expect-error as it was marked unused
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // const { searchParams } = new URL(request.url);
  // const brandId = searchParams.get('brandId'); // Example: if filtering by brand

  try {
    const { data, error } = await supabase
      .from('scorecard_metrics')
      .select('id, metric_config') // Select id and the metric_config object
      .eq('user_id', user.id);
      // .eq('brand_id', brandId); // if using brandId

    if (error) {
      console.error('Supabase error fetching metrics:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the array of metric_config objects, including their IDs
    const metrics = data?.map(item => ({ ...(item.metric_config as NewMetric), id: item.id })) || [];
    return NextResponse.json(metrics, { status: 200 });

  } catch (err) {
    console.error('Error processing GET request for metrics:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/* // Mock PUT and DELETE, can be implemented with Supabase later if needed
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Mock update - in real implementation, update database
    return NextResponse.json({ 
      metric: { 
        ...body, 
        updated_at: new Date().toISOString() 
      } 
    });

  } catch (error) {
    console.error('Error in scorecard metrics PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Mock delete - in real implementation, delete from database
    return NextResponse.json({ message: 'Metric deleted successfully' });

  } catch (error) {
    console.error('Error in scorecard metrics DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/
