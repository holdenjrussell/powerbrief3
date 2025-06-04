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
      .from('todos')
      .select('*')
      .eq('user_id', user.id);

    // Filter by brand if brandId is provided
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    const { data: todos, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
      return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
    }

    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Error in GET /api/team-sync/todos:', error);
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
    const { title, description, due_date, assignee_id, priority = 'normal', brand_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Convert empty string assignee_id to null for UUID field
    const processedAssigneeId = (assignee_id === '' || assignee_id === undefined || assignee_id === null) ? null : assignee_id;

    const insertData: {
      user_id: string;
      title: string;
      description?: string;
      due_date?: string;
      assignee_id: string | null;
      priority: string;
      brand_id?: string;
    } = {
      user_id: session.user.id,
      title,
      description,
      due_date,
      assignee_id: processedAssigneeId,
      priority
    };

    // Add brand_id if provided
    if (brand_id) {
      insertData.brand_id = brand_id;
    }

    const { data: todo, error } = await supabase
      .from('todos')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error creating todo:', error);
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
    const { id, title, description, completed, due_date, assignee_id, priority, brand_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      completed?: boolean;
      due_date?: string;
      assignee_id?: string | null;
      priority?: string;
      brand_id?: string;
    } = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) updateData.completed = completed;
    if (due_date !== undefined) updateData.due_date = due_date;
    // Convert empty string assignee_id to null for UUID field
    if (assignee_id !== undefined) updateData.assignee_id = (assignee_id === '' || assignee_id === null) ? null : assignee_id;
    if (priority !== undefined) updateData.priority = priority;
    if (brand_id !== undefined) updateData.brand_id = brand_id;

    const { data: todo, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error updating todo:', error);
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
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 