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
    const teamId = searchParams.get('teamId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('issues')
      .select('*')
      .eq('brand_id', brandId)
      .order('priority_order', { ascending: true });

    // Filter by team if teamId is provided
    if (teamId) {
      query = query.eq('target_team_id', teamId);
    }

    const { data: issues, error } = await query;

    if (error) {
      console.error('Error fetching issues:', error);
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }

    // Then get user emails for each issue
    const issuesWithEmails = await Promise.all(
      (issues || []).map(async (issue) => {
        let creatorEmail = 'Team Member'; // Default fallback
        
        if (issue.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', issue.user_id)
            .single();
          
          if (profile?.email) {
            creatorEmail = profile.email;
          }
        }
        
        return {
          ...issue,
          creator: { email: creatorEmail }
        };
      })
    );

    return NextResponse.json({ issues: issuesWithEmails });
  } catch (error) {
    console.error('Error in GET /api/team-sync/issues:', error);
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
    const { title, description, issue_type = 'short_term', assignee_id, priority_order = 0, brand_id, team_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    // Handle empty assignee_id - convert empty string to null
    const cleanAssigneeId = (assignee_id && assignee_id.trim() !== '') ? assignee_id : null;

    const { data: issue, error } = await supabase
      .from('issues')
      .insert({
        user_id: user.id,
        brand_id,
        title,
        description,
        issue_type,
        assignee_id: cleanAssigneeId,
        priority_order,
        target_team_id: team_id || null
      })
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
    if (assignee_id !== undefined) {
      // Handle empty assignee_id - convert empty string to null
      updateData.assignee_id = (assignee_id && assignee_id.trim() !== '') ? assignee_id : null;
    }
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
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 