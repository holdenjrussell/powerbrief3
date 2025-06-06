import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, settings } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    // Update the AI coordinator settings - using any until TS server refreshes
    const { data, error } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .update({
        settings,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI coordinator settings:', error);
      return NextResponse.json({ 
        error: 'Failed to update settings',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      coordinator: data 
    });

  } catch (error) {
    console.error('Error in PUT /api/ugc/ai-coordinator/settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get the AI coordinator settings - using any until TS server refreshes
    const { data, error } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .select('*')
      .eq('brand_id', brandId)
      .single();

    if (error) {
      console.error('Error fetching AI coordinator settings:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch settings',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      coordinator: data 
    });

  } catch (error) {
    console.error('Error in GET /api/ugc/ai-coordinator/settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 