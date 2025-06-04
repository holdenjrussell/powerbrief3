import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    let query = supabase
      .from('announcements')
      .select('*');

    // Filter by brand if brandId is provided
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data: announcements, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error in GET /api/team-sync/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, priority = 'normal', brand_id } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const insertData: {
      user_id: string;
      title: string;
      content: string;
      priority: string;
      brand_id?: string;
    } = {
      user_id: session.user.id,
      title,
      content,
      priority
    };

    // Add brand_id if provided
    if (brand_id) {
      insertData.brand_id = brand_id;
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, priority, brand_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const updateData: {
      title?: string;
      content?: string;
      priority?: string;
      updated_at: string;
      brand_id?: string;
    } = { 
      title, 
      content, 
      priority, 
      updated_at: new Date().toISOString() 
    };

    // Add brand_id if provided
    if (brand_id !== undefined) {
      updateData.brand_id = brand_id;
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 