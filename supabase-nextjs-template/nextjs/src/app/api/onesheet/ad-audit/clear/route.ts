import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { onesheet_id } = body;

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // Get OneSheet to verify ownership
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('id, brand_id, ad_account_audit, stages_completed')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Verify brand ownership
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', onesheet.brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 });
    }

    // Extract Supabase asset URLs from existing ads to preserve them
    const auditData = onesheet.ad_account_audit as any;
    const existingAds = auditData?.ads || [];
    const assetCache: Record<string, { assetUrl: string; assetType: string }> = {};
    
    existingAds.forEach((ad: { id: string; assetId?: string; name: string; assetUrl?: string; assetType?: string; assetLoadFailed?: boolean }) => {
      // Only preserve assets that are stored in Supabase
      if (ad.assetUrl && ad.assetUrl.includes('supabase') && !ad.assetLoadFailed) {
        // Use a unique identifier (could be ad ID, asset ID, or a combination)
        const cacheKey = `${ad.id}_${ad.assetId || ad.name}`;
        assetCache[cacheKey] = {
          assetUrl: ad.assetUrl,
          assetType: ad.assetType || 'unknown'
        };
      }
    });

    // Clear the ad audit data and AI strategist opinion but preserve the asset cache
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ 
        ad_account_audit: {
          ads: [],
          demographicBreakdown: {
            age: {},
            gender: {},
            placement: {}
          },
          performanceByAngle: {},
          performanceByFormat: {},
          performanceByEmotion: {},
          performanceByFramework: {},
          // Preserve asset cache for future imports
          assetCache: assetCache
        },
        ai_strategist_opinion: null, // Clear strategist analysis
        stages_completed: {
          ...(onesheet.stages_completed as Record<string, any> || {}),
          ad_audit: false
        }
      })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Failed to clear ad audit data:', updateError);
      return NextResponse.json({ error: 'Failed to clear audit data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ad audit data cleared successfully',
      preservedAssets: Object.keys(assetCache).length
    });

  } catch (error) {
    console.error('Error clearing ad audit data:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 