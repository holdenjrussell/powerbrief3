import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const adAccountId = searchParams.get('adAccountId');

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
  }

  const supabase = await createSSRClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use any type to bypass TypeScript checking for new table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('campaign_favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('brand_id', brandId);

    if (adAccountId) {
      query = query.eq('ad_account_id', adAccountId);
    }

    const { data: favorites, error } = await query;

    if (error) {
      console.error('Error fetching campaign favorites:', error);
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }

    return NextResponse.json(favorites || []);
  } catch (error) {
    console.error('Error in campaign favorites GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, campaignId, campaignName, adAccountId } = body;

    if (!brandId || !campaignId || !adAccountId) {
      return NextResponse.json({ 
        error: 'Brand ID, campaign ID, and ad account ID are required' 
      }, { status: 400 });
    }

    // Use any type to bypass TypeScript checking for new table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_favorites')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        campaign_id: campaignId,
        campaign_name: campaignName,
        ad_account_id: adAccountId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Campaign is already favorited' }, { status: 409 });
      }
      console.error('Error creating campaign favorite:', error);
      return NextResponse.json({ error: 'Failed to create favorite' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in campaign favorites POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const campaignId = searchParams.get('campaignId');

  if (!brandId || !campaignId) {
    return NextResponse.json({ 
      error: 'Brand ID and campaign ID are required' 
    }, { status: 400 });
  }

  const supabase = await createSSRClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use any type to bypass TypeScript checking for new table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('campaign_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('brand_id', brandId)
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error deleting campaign favorite:', error);
      return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in campaign favorites DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 