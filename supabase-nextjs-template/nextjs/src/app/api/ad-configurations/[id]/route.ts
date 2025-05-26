import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { UpdateAdConfigurationRequest } from '@/lib/types/adConfigurations';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSSRClient();
    const { id } = params;

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: configuration, error } = await supabase
      .from('ad_configurations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
      }
      console.error('Error fetching ad configuration:', error);
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error in GET /api/ad-configurations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSSRClient();
    const { id } = params;
    const body: UpdateAdConfigurationRequest = await request.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if configuration exists and belongs to user
    const { data: existing } = await supabase
      .from('ad_configurations')
      .select('id, brand_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // If updating name, check for conflicts
    if (body.name) {
      const { data: nameConflict } = await supabase
        .from('ad_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('brand_id', existing.brand_id)
        .eq('name', body.name)
        .neq('id', id)
        .single();

      if (nameConflict) {
        return NextResponse.json({ error: 'Configuration name already exists for this brand' }, { status: 409 });
      }
    }

    // Update the configuration
    const { data: configuration, error } = await supabase
      .from('ad_configurations')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ad configuration:', error);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error in PUT /api/ad-configurations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSSRClient();
    const { id } = params;

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the configuration
    const { error } = await supabase
      .from('ad_configurations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting ad configuration:', error);
      return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/ad-configurations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 