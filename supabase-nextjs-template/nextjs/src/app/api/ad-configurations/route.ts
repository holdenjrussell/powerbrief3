import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { CreateAdConfigurationRequest } from '@/lib/types/adConfigurations';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove user_id filter - let RLS policies handle access control
    // This allows shared brand users to see configurations for brands they have access to
    let query = supabase
      .from('ad_configurations')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by brand if specified
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data: configurations, error } = await query;

    if (error) {
      console.error('Error fetching ad configurations:', error);
      return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
    }

    return NextResponse.json(configurations || []);
  } catch (error) {
    console.error('Error in GET /api/ad-configurations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const body: CreateAdConfigurationRequest = await request.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required fields
    if (!body.brand_id || !body.name || !body.settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if configuration name already exists for this brand
    const { data: existing } = await supabase
      .from('ad_configurations')
      .select('id')
      .eq('user_id', user.id)
      .eq('brand_id', body.brand_id)
      .eq('name', body.name)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Configuration name already exists for this brand' }, { status: 409 });
    }

    // Create the configuration
    const { data: configuration, error } = await supabase
      .from('ad_configurations')
      .insert({
        user_id: user.id,
        brand_id: body.brand_id,
        name: body.name,
        description: body.description,
        is_default: body.is_default || false,
        settings: body.settings
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ad configuration:', error);
      return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 });
    }

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/ad-configurations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 