import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(
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

    // Get team members with user details from brand_shares
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        created_at,
        brand_shares!inner(
          shared_with_user_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // Also get brand owner info
    const { data: team } = await supabase
      .from('teams')
      .select(`
        brand_id,
        brands!inner(
          user_id,
          users:auth.users!inner(
            email
          )
        )
      `)
      .eq('id', teamId)
      .single();

    // Format the response
    const members = teamMembers?.map(member => ({
      // @ts-ignore - Type will be available after migration
      user_id: member.user_id,
      // @ts-ignore - Type will be available after migration
      email: member.brand_shares?.email || '',
      // @ts-ignore - Type will be available after migration
      first_name: member.brand_shares?.first_name || '',
      // @ts-ignore - Type will be available after migration
      last_name: member.brand_shares?.last_name || '',
      // @ts-ignore - Type will be available after migration
      created_at: member.created_at,
      is_owner: false
    })) || [];

    // Add brand owner to the list
    if (team) {
      members.push({
        // @ts-ignore - Type will be available after migration
        user_id: team.brands.user_id,
        // @ts-ignore - Type will be available after migration
        email: team.brands.users.email,
        first_name: 'Brand',
        last_name: 'Owner',
        created_at: null,
        is_owner: true
      });
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error in team members GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Unauthorized to manage this team' }, { status: 403 });
    }

    // Verify all users have accepted brand share
    const { data: validShares } = await supabase
      .from('brand_shares')
      .select('shared_with_user_id')
      .eq('brand_id', team.brand_id)
      .eq('status', 'accepted')
      .in('shared_with_user_id', userIds);

    const validUserIds = validShares?.map(share => share.shared_with_user_id) || [];
    
    if (validUserIds.length !== userIds.length) {
      return NextResponse.json({ 
        error: 'Some users do not have accepted brand share invitations' 
      }, { status: 400 });
    }

    // Add users to team
    const teamMembers = validUserIds.map(userId => ({
      team_id: teamId,
      user_id: userId
    }));

    const { error } = await supabase
      .from('team_members')
      .insert(teamMembers);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Some users are already team members' }, { status: 400 });
      }
      console.error('Error adding team members:', error);
      return NextResponse.json({ error: 'Failed to add team members' }, { status: 500 });
    }

    // Update brand_shares to include this team
    for (const userId of validUserIds) {
      const { data: currentShare } = await supabase
        .from('brand_shares')
        .select('team_ids')
        .eq('brand_id', team.brand_id)
        .eq('shared_with_user_id', userId)
        .single();

      // @ts-ignore - Type will be available after migration
      const currentTeamIds = currentShare?.team_ids || [];
      if (!currentTeamIds.includes(teamId)) {
        await supabase
          .from('brand_shares')
          .update({
            team_ids: [...currentTeamIds, teamId]
          })
          .eq('brand_id', team.brand_id)
          .eq('shared_with_user_id', userId);
      }
    }

    return NextResponse.json({ success: true, added: validUserIds.length });
  } catch (error) {
    console.error('Error in team members POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}