import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get teams for the brand with member count
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(user_id)
      `)
      .eq('brand_id', brandId)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // Process teams to include member count
    const processedTeams = teams?.map(team => ({
      ...team,
      // @ts-ignore - Type will be available after migration
      member_count: team.team_members?.length || 0,
      team_members: undefined // Remove raw data
    })) || [];

    return NextResponse.json({ teams: processedTeams });
  } catch (error) {
    console.error('Error in teams GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, name } = body;

    console.log('Creating team:', { brandId, name, userId: user.id });

    if (!brandId || !name) {
      return NextResponse.json({ error: 'Brand ID and name are required' }, { status: 400 });
    }

    // Check if user owns the brand or has edit access through sharing
    const { data: brandAccess } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .maybeSingle();

    let hasAccess = false;
    
    if (brandAccess && brandAccess.user_id === user.id) {
      hasAccess = true;
      console.log('User owns the brand');
    } else {
      // Check if user has edit access through brand sharing
      const { data: sharedAccess } = await supabase
        .from('brand_shares')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .eq('permission', 'edit')
        .maybeSingle();
      
      if (sharedAccess) {
        hasAccess = true;
        console.log('User has edit access through sharing');
      }
    }

    if (!hasAccess) {
      console.log('User does not have access to create teams for this brand');
      return NextResponse.json({ error: 'Unauthorized to create teams for this brand' }, { status: 403 });
    }

    // Create the team
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        brand_id: brandId,
        name,
        is_default: false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A team with this name already exists' }, { status: 400 });
      }
      console.error('Error creating team:', error);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    // Add default feature access for the new team
    const features = [
      'powerbrief_onesheet',
      'powerbrief_ads',
      'powerbrief_web_assets',
      'powerbrief_email',
      'powerbrief_sms',
      'powerbrief_organic_social',
      'powerbrief_blog',
      'powerframe',
      'ugc_creator_pipeline',
      'team_sync',
      'asset_reviews',
      'ad_ripper',
      'ad_upload_tool',
      'url_to_markdown'
    ];

    const featureAccess = features.map(feature => ({
      // @ts-ignore - Type will be available after migration
      team_id: team.id,
      feature_key: feature,
      has_access: true
    }));

    const { error: featureError } = await supabase
      .from('team_feature_access')
      .insert(featureAccess);

    if (featureError) {
      console.error('Error adding feature access:', featureError);
      // Don't fail the entire request, just log the error
      // Teams can still be created without feature access
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error in teams POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}