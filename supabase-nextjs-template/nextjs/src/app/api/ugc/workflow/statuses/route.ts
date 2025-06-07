import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Fetch custom statuses for a brand
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ugc_custom_creator_statuses')
      .select('*')
      .order('category', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching custom creator statuses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/ugc/workflow/statuses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new custom status
export async function POST(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { brand_id, status_name, category, display_order, color, is_final } = body;

    if (!brand_id || !status_name || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: brand_id, status_name, category' 
      }, { status: 400 });
    }

    // Check if status name already exists for this brand
    const { data: existing } = await supabase
      .from('ugc_custom_creator_statuses')
      .select('id')
      .eq('brand_id', brand_id)
      .eq('status_name', status_name)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Status name already exists for this brand' 
      }, { status: 400 });
    }

    const { data: status, error } = await supabase
      .from('ugc_custom_creator_statuses')
      .insert({
        brand_id,
        status_name,
        category,
        display_order: display_order || 0,
        color: color || '#6B7280',
        is_final: is_final || false,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom status:', error);
      return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Create custom status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a custom status
export async function PUT(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { id, status_name, category, display_order, color, is_final, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    const updateData: {
      status_name?: string;
      category?: string;
      display_order?: number;
      color?: string;
      is_final?: boolean;
      is_active?: boolean;
    } = {};
    
    if (status_name !== undefined) updateData.status_name = status_name;
    if (category !== undefined) updateData.category = category;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (color !== undefined) updateData.color = color;
    if (is_final !== undefined) updateData.is_final = is_final;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: status, error } = await supabase
      .from('ugc_custom_creator_statuses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Update custom status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete a custom status
export async function DELETE(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('id');

    if (!statusId) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('ugc_custom_creator_statuses')
      .update({ is_active: false })
      .eq('id', statusId);

    if (error) {
      console.error('Error deleting custom status:', error);
      return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete custom status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 