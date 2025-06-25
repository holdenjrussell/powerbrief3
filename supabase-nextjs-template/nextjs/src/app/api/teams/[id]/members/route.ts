import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;

    // Get team with brand info
    const { data: team } = await supabase
      .from('teams')
      .select(`
        id,
        brand_id,
        brands!inner(
          user_id
        )
      `)
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        created_at
      `)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    // Get all user profiles for team members
    const userIds = teamMembers?.map(m => m.user_id) || [];
    
    // Add brand owner to the list if not already included
    if (team.brands.user_id && !userIds.includes(team.brands.user_id)) {
      userIds.push(team.brands.user_id);
    }

    // Get profiles for all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);

    // Also get brand shares to get additional info
    const { data: brandShares } = await supabase
      .from('brand_shares')
      .select('shared_with_user_id, first_name, last_name, shared_with_email, role')
      .eq('brand_id', team.brand_id)
      .eq('status', 'accepted')
      .in('shared_with_user_id', userIds);

    // Create a map for easy lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const shareMap = new Map(brandShares?.map(s => [s.shared_with_user_id, s]) || []);

    // Format the response
    const members = userIds.map(userId => {
      const profile = profileMap.get(userId);
      const share = shareMap.get(userId);
      const isOwner = userId === team.brands.user_id;
      const teamMember = teamMembers?.find(m => m.user_id === userId);

      return {
        id: userId,
        email: profile?.email || share?.shared_with_email || '',
        fullName: profile?.full_name || `${share?.first_name || ''} ${share?.last_name || ''}`.trim() || '',
        avatarUrl: profile?.avatar_url || null,
        role: isOwner ? 'owner' : (share?.role || 'member'),
        isOwner,
        created_at: teamMember?.created_at || null,
        // Legacy fields for compatibility
        first_name: share?.first_name || '',
        last_name: share?.last_name || ''
      };
    });

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
    const { user_ids } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
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

    // Verify all users have accepted brand share or are the owner
    const { data: validShares } = await supabase
      .from('brand_shares')
      .select('shared_with_user_id')
      .eq('brand_id', team.brand_id)
      .eq('status', 'accepted')
      .in('shared_with_user_id', user_ids);

    const validUserIds = validShares?.map(share => share.shared_with_user_id) || [];
    
    // Also check if any of the user_ids is the brand owner
    const { data: brandOwner } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', team.brand_id)
      .single();

    if (brandOwner && user_ids.includes(brandOwner.user_id) && !validUserIds.includes(brandOwner.user_id)) {
      validUserIds.push(brandOwner.user_id);
    }
    
    if (validUserIds.length !== user_ids.length) {
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
      // Skip if user is the brand owner
      if (userId === brandOwner?.user_id) continue;

      const { data: currentShare } = await supabase
        .from('brand_shares')
        .select('team_ids')
        .eq('brand_id', team.brand_id)
        .eq('shared_with_user_id', userId)
        .single();

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