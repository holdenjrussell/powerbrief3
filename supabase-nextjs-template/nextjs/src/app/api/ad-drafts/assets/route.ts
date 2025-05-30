import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, draftIds } = body;

    if (!brandId || !draftIds || !Array.isArray(draftIds)) {
      return NextResponse.json({ 
        error: 'Brand ID and draft IDs array are required' 
      }, { status: 400 });
    }

    // Get Supabase client
    const supabase = await createSSRClient();

    // Fetch assets for the specified ad drafts
    const { data: assets, error } = await supabase
      .from('ad_draft_assets')
      .select('id, name, supabase_url, type, ad_draft_id')
      .in('ad_draft_id', draftIds);

    if (error) {
      console.error('Error fetching assets:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch assets' 
      }, { status: 500 });
    }

    return NextResponse.json(assets || []);

  } catch (error) {
    console.error('Assets API error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 