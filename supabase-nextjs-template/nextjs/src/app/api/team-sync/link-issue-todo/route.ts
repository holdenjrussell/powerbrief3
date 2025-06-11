import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issue_id, todo_id } = body;

    if (!issue_id || !todo_id) {
      return NextResponse.json({ error: 'Both issue_id and todo_id are required' }, { status: 400 });
    }

    // Create the link in both directions
    const { error: issueTodoError } = await supabase
      .from('issue_todos')
      .insert({ issue_id, todo_id });

    if (issueTodoError) {
      throw issueTodoError;
    }

    const { error: todoIssueError } = await supabase
      .from('todo_issues')
      .insert({ todo_id, issue_id });

    if (todoIssueError) {
      throw todoIssueError;
    }

    return NextResponse.json({ message: 'Issue and todo linked successfully' });
  } catch (error) {
    console.error('Error linking issue and todo:', error);
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
    const issue_id = searchParams.get('issue_id');
    const todo_id = searchParams.get('todo_id');

    if (!issue_id || !todo_id) {
      return NextResponse.json({ error: 'Both issue_id and todo_id are required' }, { status: 400 });
    }

    // Remove the link from both directions
    const { error: issueTodoError } = await supabase
      .from('issue_todos')
      .delete()
      .eq('issue_id', issue_id)
      .eq('todo_id', todo_id);

    if (issueTodoError) {
      throw issueTodoError;
    }

    const { error: todoIssueError } = await supabase
      .from('todo_issues')
      .delete()
      .eq('todo_id', todo_id)
      .eq('issue_id', issue_id);

    if (todoIssueError) {
      throw todoIssueError;
    }

    return NextResponse.json({ message: 'Issue and todo unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking issue and todo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const issue_id = searchParams.get('issue_id');
    const todo_id = searchParams.get('todo_id');

    if (issue_id) {
      // Get todos linked to an issue (simplified without profile joins)
      const { data: linkedTodos, error } = await supabase
        .from('issue_todos')
        .select(`
          todo_id,
          todos:todo_id (*)
        `)
        .eq('issue_id', issue_id);

      if (error) {
        throw error;
      }

      return NextResponse.json({ linkedTodos: linkedTodos.map(lt => lt.todos) });
    }

    if (todo_id) {
      // Get issues linked to a todo (simplified without profile joins)
      const { data: linkedIssues, error } = await supabase
        .from('todo_issues')
        .select(`
          issue_id,
          issues:issue_id (*)
        `)
        .eq('todo_id', todo_id);

      if (error) {
        throw error;
      }

      return NextResponse.json({ linkedIssues: linkedIssues.map(li => li.issues) });
    }

    return NextResponse.json({ error: 'Either issue_id or todo_id is required' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching linked items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 