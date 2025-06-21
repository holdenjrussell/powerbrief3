import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Get OneSheet with brand access check
    const { data: onesheet, error } = await supabase
      .from('onesheet')
      .select(`
        *,
        brands!inner(
          id,
          user_id,
          name,
          brand_shares(
            shared_with_user_id,
            status
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Check user access to the brand
    const brand = onesheet.brands;
    const isOwner = brand.user_id === user.id;
    const hasSharedAccess = brand.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this OneSheet' }, { status: 403 });
    }

    // Remove the brands property from the response to keep the original OneSheet structure
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { brands, ...cleanOnesheet } = onesheet;

    return NextResponse.json(cleanOnesheet);
  } catch (error) {
    console.error('OneSheet fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const updates = await request.json();

    // Verify user has access to this OneSheet
    const { data: onesheet } = await supabase
      .from('onesheet')
      .select(`
        user_id,
        brand_id,
        brands!inner(
          user_id,
          brand_shares(
            shared_with_user_id,
            status
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const brand = onesheet.brands;
    const isOwner = brand.user_id === user.id;
    const hasSharedAccess = brand.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this OneSheet' }, { status: 403 });
    }

    // Update the OneSheet
    const { data: updatedOnesheet, error: updateError } = await supabase
      .from('onesheet')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating OneSheet:', updateError);
      return NextResponse.json({ error: 'Failed to update OneSheet' }, { status: 500 });
    }

    return NextResponse.json(updatedOnesheet);
  } catch (error) {
    console.error('OneSheet update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Verify user has access to this OneSheet before deleting
    const { data: onesheet } = await supabase
      .from('onesheet')
      .select(`
        user_id,
        brand_id,
        brands!inner(
          user_id,
          brand_shares(
            shared_with_user_id,
            status
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const brand = onesheet.brands;
    const isOwner = brand.user_id === user.id;
    const hasSharedAccess = brand.brand_shares?.some((share: { shared_with_user_id: string; status: string }) => 
      share.shared_with_user_id === user.id && share.status === 'accepted'
    );

    if (!isOwner && !hasSharedAccess) {
      return NextResponse.json({ error: 'Access denied to this OneSheet' }, { status: 403 });
    }
    
    // Delete the OneSheet
    const { error } = await supabase
      .from('onesheet')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting OneSheet:', error);
      return NextResponse.json({ error: 'Failed to delete OneSheet' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OneSheet deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 