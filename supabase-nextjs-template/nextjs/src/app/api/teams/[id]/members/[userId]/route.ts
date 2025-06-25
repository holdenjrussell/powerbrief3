import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const userIdToRemove = params.userId;

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
      .select('id, user_id')
      .eq('id', team.brand_id)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Unauthorized to manage this team' }, { status: 403 });
    }

    // Prevent removing the brand owner
    if (userIdToRemove === brand.user_id) {
      return NextResponse.json({ error: 'Cannot remove brand owner from team' }, { status: 400 });
    }

    // Remove user from team
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userIdToRemove);

    if (error) {
      console.error('Error removing team member:', error);
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
    }

    // Update brand_shares to remove this team
    const { data: currentShare } = await supabase
      .from('brand_shares')
      .select('team_ids')
      .eq('brand_id', team.brand_id)
      .eq('shared_with_user_id', userIdToRemove)
      .single();

    if (currentShare) {
      // @ts-ignore - Type will be available after migration
      const updatedTeamIds = (currentShare.team_ids || []).filter((id: string) => id !== teamId);
      
      await supabase
        .from('brand_shares')
        .update({
          team_ids: updatedTeamIds
        })
        .eq('brand_id', team.brand_id)
        .eq('shared_with_user_id', userIdToRemove);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in team member DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}