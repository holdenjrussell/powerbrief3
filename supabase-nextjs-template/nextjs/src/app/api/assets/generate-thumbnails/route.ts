import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface GenerateThumbnailsRequest {
  assetIds: string[];
}

export async function POST(req: NextRequest) {
  const supabase = await createSSRClient();
  
  // Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const { assetIds }: GenerateThumbnailsRequest = await req.json();

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ message: 'No asset IDs provided.' }, { status: 400 });
    }

    console.log(`[Generate Thumbnails] Processing ${assetIds.length} assets for user ${user.id}`);

    // Get video assets (simplified query without thumbnail_url until migration is run)
    const { data: assets, error: fetchError } = await supabase
      .from('ad_draft_assets')
      .select(`
        id,
        name,
        supabase_url,
        type,
        ad_draft_id,
        ad_drafts!inner(user_id)
      `)
      .in('id', assetIds)
      .eq('type', 'video')
      .eq('ad_drafts.user_id', user.id);

    if (fetchError) {
      console.error('[Generate Thumbnails] Error fetching assets:', fetchError);
      return NextResponse.json({ message: 'Failed to fetch assets.', error: fetchError.message }, { status: 500 });
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ 
        message: 'No video assets found.',
        results: []
      }, { status: 200 });
    }

    console.log(`[Generate Thumbnails] Found ${assets.length} video assets`);

    // Return assets for client-side processing
    return NextResponse.json({
      message: 'Assets ready for thumbnail generation',
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        supabaseUrl: asset.supabase_url,
        type: asset.type
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('[Generate Thumbnails] Unexpected error:', error);
    return NextResponse.json({ 
      message: 'Internal server error.', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Endpoint to update thumbnail URL after client-side generation
export async function PATCH(req: NextRequest) {
  const supabase = await createSSRClient();
  
  // Authenticate user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const { assetId, thumbnailUrl }: { assetId: string; thumbnailUrl: string } = await req.json();

    if (!assetId || !thumbnailUrl) {
      return NextResponse.json({ message: 'Asset ID and thumbnail URL are required.' }, { status: 400 });
    }

    // Note: This will work after the migration is run
    // For now, just log the update
    console.log(`[Update Thumbnail] Would update asset ${assetId} with thumbnail ${thumbnailUrl}`);

    return NextResponse.json({ 
      message: 'Thumbnail URL update logged (migration needed to persist).',
      assetId,
      thumbnailUrl
    }, { status: 200 });

  } catch (error) {
    console.error('[Update Thumbnail] Unexpected error:', error);
    return NextResponse.json({ 
      message: 'Internal server error.', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 