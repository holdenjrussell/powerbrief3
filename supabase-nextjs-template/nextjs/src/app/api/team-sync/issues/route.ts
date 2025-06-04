import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: issues, error } = await supabase
      .from('issues')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_order', { ascending: true });

    if (error) {
      console.error('Error fetching issues:', error);
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Error in GET /api/team-sync/issues:', error);
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
    const { title, description, issue_type = 'short_term', assignee_id, priority_order = 0 } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Convert empty string assignee_id to null for UUID field
    const processedAssigneeId = (assignee_id === '' || assignee_id === undefined || assignee_id === null) ? null : assignee_id;

    const insertData = {
      user_id: session.user.id,
      title,
      description,
      issue_type,
      assignee_id: processedAssigneeId,
      priority_order
    };

    const { data: issue, error } = await supabase
      .from('issues')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Error creating issue:', error);
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
    const { id, title, description, issue_type, status, assignee_id, priority_order } = body;

    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const updateData: {
      updated_at: string;
      title?: string;
      description?: string;
      issue_type?: 'short_term' | 'long_term';
      status?: 'open' | 'in_progress' | 'resolved';
      assignee_id?: string | null;
      priority_order?: number;
    } = { updated_at: new Date().toISOString() };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (issue_type !== undefined) updateData.issue_type = issue_type;
    if (status !== undefined) updateData.status = status;
    // Convert empty string assignee_id to null for UUID field
    if (assignee_id !== undefined) updateData.assignee_id = (assignee_id === '' || assignee_id === null) ? null : assignee_id;
    if (priority_order !== undefined) updateData.priority_order = priority_order;

    const { data: issue, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Error updating issue:', error);
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
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 