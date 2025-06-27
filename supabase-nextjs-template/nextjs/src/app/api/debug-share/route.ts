import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const searchParams = request.nextUrl.searchParams;
    const shareId = searchParams.get('shareId');
    const brandId = searchParams.get('brandId');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('brief_batches')
      .select('id, name, brand_id, user_id, share_settings, created_at, updated_at')
      .not('share_settings', 'is', null);
    
    // If brandId is provided, filter by it
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    
    // If user is logged in, show only their batches or batches they have access to
    if (user) {
      query = query.or(`user_id.eq.${user.id},brand_id.in.(select brand_id from brand_shares where shared_with_user_id='${user.id}' and status='accepted')`);
    }
    
    const { data: batches, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Process batches to show share information
    const debugInfo = batches?.map(batch => {
      const shareSettings = batch.share_settings as Record<string, any> || {};
      const shareIds = Object.keys(shareSettings);
      const hasTargetShare = shareId ? shareIds.includes(shareId) : false;
      
      return {
        batchId: batch.id,
        batchName: batch.name,
        brandId: batch.brand_id,
        userId: batch.user_id,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
        totalShares: shareIds.length,
        shareIds: shareIds,
        hasTargetShare,
        targetShareDetails: hasTargetShare && shareId ? shareSettings[shareId] : null,
        allShareDetails: shareSettings
      };
    });
    
    // Find batch with specific shareId if provided
    const matchingBatch = shareId 
      ? debugInfo?.find(batch => batch.hasTargetShare)
      : null;
    
    return NextResponse.json({
      success: true,
      currentUser: user ? { id: user.id, email: user.email } : null,
      searchParams: {
        shareId,
        brandId
      },
      totalBatchesFound: debugInfo?.length || 0,
      matchingBatch,
      allBatches: debugInfo
    });
    
  } catch (error) {
    console.error('Debug share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 