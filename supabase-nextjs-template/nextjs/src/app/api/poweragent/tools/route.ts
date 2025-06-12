import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Check brand access
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get tools for the brand
    const { data: tools, error } = await supabase
      .from('poweragent_tools')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tools:', error);
      return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
    }

    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Tools API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, parameters, execute_code, brand_id } = body;

    if (!name || !brand_id) {
      return NextResponse.json(
        { error: 'Name and brand_id are required' },
        { status: 400 }
      );
    }

    // Check brand access
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the tool
    const { data: tool, error } = await supabase
      .from('poweragent_tools')
      .insert({
        name,
        description,
        parameters,
        execute_code,
        brand_id,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tool:', error);
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    console.error('Tools API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 