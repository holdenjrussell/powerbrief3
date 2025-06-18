import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';



export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onesheet_id = searchParams.get('onesheet_id');

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID required' }, { status: 400 });
    }

    // Get the OneSheet and verify user has access to its brand
    const { data: onesheet } = await (supabase as any)
      .from('onesheet')
      .select(`
        id,
        brand_id,
        brands!inner(
          id,
          user_id
        )
      `)
      .eq('id', onesheet_id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Check if user owns the brand or has shared access
    const isOwner = onesheet.brands.user_id === user.id;
    
    let hasSharedAccess = false;
    if (!isOwner) {
      const { data: sharedAccess } = await (supabase as any)
        .from('brand_shares')
        .select('id')
        .eq('brand_id', onesheet.brand_id)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();
      
      hasSharedAccess = !!sharedAccess;
    }

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 });
    }

    // Fetch context data
    const { data, error } = await (supabase as any)
      .from('onesheet_context_data')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching context data:', error);
      return NextResponse.json({ error: 'Failed to fetch context data' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Context GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { onesheet_id, source_type, source_name, source_url, content_text, extracted_data, metadata } = body;

    if (!onesheet_id || !source_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the OneSheet and verify user has access to its brand
    const { data: onesheet } = await (supabase as any)
      .from('onesheet')
      .select(`
        id,
        brand_id,
        brands!inner(
          id,
          user_id
        )
      `)
      .eq('id', onesheet_id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Check if user owns the brand or has shared access
    const isOwner = onesheet.brands.user_id === user.id;
    
    let hasSharedAccess = false;
    if (!isOwner) {
      const { data: sharedAccess } = await (supabase as any)
        .from('brand_shares')
        .select('id')
        .eq('brand_id', onesheet.brand_id)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();
      
      hasSharedAccess = !!sharedAccess;
    }

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 });
    }

    // Always create new context instead of checking for existing
    // This allows multiple entries per source type (e.g., multiple articles)
    const { data: contextData, error } = await (supabase as any)
      .from('onesheet_context_data')
      .insert({
        onesheet_id,
        source_type,
        source_name: source_name || null,
        source_url: source_url || null,
        content_text: content_text || null,
        extracted_data: extracted_data || {},
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating context:', error);
      return NextResponse.json({ error: 'Failed to create context', details: error.message }, { status: 500 });
    }

    return NextResponse.json(contextData);
  } catch (error) {
    console.error('Context POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, source_name, source_url, content_text, extracted_data, metadata } = body;

    if (!id) {
      return NextResponse.json({ error: 'Context ID required' }, { status: 400 });
    }

    // Verify user owns this context via onesheet
    const { data: context } = await (supabase as any)
      .from('onesheet_context_data')
      .select('onesheet_id')
      .eq('id', id)
      .single();

    if (!context) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 });
    }

    const { data: onesheet } = await (supabase as any)
      .from('onesheet')
      .select(`
        id,
        brand_id,
        brands!inner(
          id,
          user_id,
          brand_shares(
            shared_with_user_id,
            status
          )
        )
      `)
      .eq('id', context.onesheet_id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Check if user has access (owns brand or has accepted sharing)
    const isOwner = onesheet.brands.user_id === user.id;
    const hasSharedAccess = onesheet.brands.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update context
    const { data, error } = await (supabase as any)
      .from('onesheet_context_data')
      .update({
        source_name: source_name || null,
        source_url: source_url || null,
        content_text: content_text || null,
        extracted_data: extracted_data || {},
        metadata: metadata || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating context:', error);
      return NextResponse.json({ error: 'Failed to update context' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Context PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Context ID required' }, { status: 400 });
    }

    // Verify user owns this context via onesheet
    const { data: context } = await (supabase as any)
      .from('onesheet_context_data')
      .select('onesheet_id')
      .eq('id', id)
      .single();

    if (!context) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 });
    }

    const { data: onesheet } = await (supabase as any)
      .from('onesheet')
      .select(`
        id,
        brand_id,
        brands!inner(
          id,
          user_id,
          brand_shares(
            shared_with_user_id,
            status
          )
        )
      `)
      .eq('id', context.onesheet_id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Check if user has access (owns brand or has accepted sharing)
    const isOwner = onesheet.brands.user_id === user.id;
    const hasSharedAccess = onesheet.brands.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { error } = await (supabase as any)
      .from('onesheet_context_data')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting context:', error);
      return NextResponse.json({ error: 'Failed to delete context' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Context DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 