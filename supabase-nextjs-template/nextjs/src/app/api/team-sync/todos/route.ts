import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Todos API] Starting GET request');
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[Todos API] User auth result:', { user: user?.id, error: userError });
    
    if (userError || !user) {
      console.error('[Todos API] Authentication failed:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const teamId = searchParams.get('teamId');
    
    console.log('[Todos API] Request params:', { brandId, teamId, userId: user.id });

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 });
    }

    // First, let's check if the user has access to this brand
    const { data: brandAccess, error: brandError } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();
    
    console.log('[Todos API] Brand access check:', { brandAccess, brandError });

    // If user doesn't own the brand, check brand sharing
    if (!brandAccess) {
      const { data: sharedAccess, error: shareError } = await supabase
        .from('brand_shares')
        .select('brand_id')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();
        
      console.log('[Todos API] Shared brand access check:', { sharedAccess, shareError });
      
      if (!sharedAccess) {
        console.error('[Todos API] User has no access to brand:', brandId);
        return NextResponse.json({ error: 'No access to this brand' }, { status: 403 });
      }
    }

    let query = supabase
      .from('todos')
      .select(`
        *,
        creator:user_id(id, email),
        assignee:assignee_id(id, email)
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    // Filter by team if teamId is provided
    if (teamId) {
      console.log('[Todos API] Filtering by team:', teamId);
      query = query.eq('target_team_id', teamId);
    }

    console.log('[Todos API] Executing query...');
    const { data: todos, error } = await query;

    console.log('[Todos API] Query result:', { todosCount: todos?.length, error });

    if (error) {
      console.error('[Todos API] Error fetching todos:', error);
      return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
    }

    console.log('[Todos API] Returning todos:', todos?.length || 0);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('[Todos API] Error in GET /api/team-sync/todos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, due_date, assignee_id, priority = 'normal', brand_id, team_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    // Handle empty assignee_id - convert empty string to null
    const cleanAssigneeId = (assignee_id && assignee_id.trim() !== '') ? assignee_id : null;

    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        title,
        description,
        due_date,
        assignee_id: cleanAssigneeId,
        priority,
        brand_id,
        target_team_id: team_id || null
      })
      .select(`
        *,
        creator:user_id(id, email),
        assignee:assignee_id(id, email)
      `)
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, completed, due_date, assignee_id, priority } = body;

    if (!id) {
      return NextResponse.json({ error: 'Todo ID is required' }, { status: 400 });
    }

    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      completed?: boolean;
      due_date?: string;
      assignee_id?: string;
      priority?: string;
    } = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) updateData.completed = completed;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (assignee_id !== undefined) {
      // Handle empty assignee_id - convert empty string to null
      updateData.assignee_id = (assignee_id && assignee_id.trim() !== '') ? assignee_id : null;
    }
    if (priority !== undefined) updateData.priority = priority;

    const { data: todo, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:user_id(id, email),
        assignee:assignee_id(id, email)
      `)
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 