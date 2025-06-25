import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Check if user owns the brand that owns this team
    const { data: team } = await supabase
      .from('teams')
      .select('brand_id')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', team.brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Unauthorized to update this team' }, { status: 403 });
    }

    // Update the team
    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update({
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A team with this name already exists' }, { status: 400 });
      }
      console.error('Error updating team:', error);
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    console.error('Error in teams PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;

    // Check if user owns the brand that owns this team
    const { data: team } = await supabase
      .from('teams')
      .select('brand_id, is_default')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    if (team.is_default) {
      return NextResponse.json({ error: 'Cannot delete default team' }, { status: 400 });
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', team.brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Unauthorized to delete this team' }, { status: 403 });
    }

    // Check if team has any data that would prevent deletion
    const { data: teamData } = await supabase
      .from('scorecard_metrics')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);

    if (teamData && teamData.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete team with existing data. Please remove all team data first.' 
      }, { status: 400 });
    }

    // Delete the team (cascade will handle team_members and team_feature_access)
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      console.error('Error deleting team:', error);
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in teams DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}