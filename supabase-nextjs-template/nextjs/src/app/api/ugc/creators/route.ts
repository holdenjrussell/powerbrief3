import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerAdminClient();
    
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Fetch creators for the brand
    const { data: creators, error: creatorsError } = await supabase
      .from('ugc_creators')
      .select('id, name, email')
      .eq('brand_id', brandId)
      .order('name', { ascending: true });

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError);
      return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      creators: creators || [],
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 