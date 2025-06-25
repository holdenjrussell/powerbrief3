import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export const FEATURE_KEYS = [
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
] as const;

export const FEATURE_LABELS: Record<string, string> = {
  'powerbrief_onesheet': 'PowerBrief - OneSheet',
  'powerbrief_ads': 'PowerBrief - Ads',
  'powerbrief_web_assets': 'PowerBrief - Web Assets',
  'powerbrief_email': 'PowerBrief - Email',
  'powerbrief_sms': 'PowerBrief - SMS',
  'powerbrief_organic_social': 'PowerBrief - Organic Social',
  'powerbrief_blog': 'PowerBrief - Blog',
  'powerframe': 'PowerFrame',
  'ugc_creator_pipeline': 'UGC Creator Pipeline',
  'team_sync': 'Team Sync',
  'asset_reviews': 'Asset Reviews',
  'ad_ripper': 'Ad Ripper',
  'ad_upload_tool': 'Ad Upload Tool',
  'url_to_markdown': 'URL to Markdown'
};

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

    // Get all feature access settings for the team
    const { data: features, error } = await supabase
      .from('team_feature_access')
      .select('feature_key, has_access')
      .eq('team_id', teamId);

    if (error) {
      console.error('Error fetching feature access:', error);
      return NextResponse.json({ error: 'Failed to fetch feature access' }, { status: 500 });
    }

    // Create a complete feature access map
    const featureAccess = FEATURE_KEYS.reduce((acc, key) => {
      const feature = features?.find(f => f.feature_key === key);
      acc[key] = {
        key,
        label: FEATURE_LABELS[key],
        has_access: feature?.has_access ?? true // Default to true if not found
      };
      return acc;
    }, {} as Record<string, { key: string; label: string; has_access: boolean }>);

    return NextResponse.json({ features: featureAccess });
  } catch (error) {
    console.error('Error in team features GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { features } = body;

    if (!features || typeof features !== 'object') {
      return NextResponse.json({ error: 'Features object is required' }, { status: 400 });
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

    // Update feature access settings
    const upserts = Object.entries(features).map(([key, hasAccess]) => ({
      team_id: teamId,
      feature_key: key,
      has_access: hasAccess,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('team_feature_access')
      .upsert(upserts, {
        onConflict: 'team_id,feature_key'
      });

    if (error) {
      console.error('Error updating feature access:', error);
      return NextResponse.json({ error: 'Failed to update feature access' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in team features PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}