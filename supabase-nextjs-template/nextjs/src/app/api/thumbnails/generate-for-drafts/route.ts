import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VideoAsset {
  id: string;
  name: string;
  supabase_url: string;
  type: string;
  ad_draft_id: string;
}

interface ThumbnailGenerationResult {
  success: boolean;
  processed: number;
  total: number;
  errors: Array<{ assetId: string; assetName: string; error: string }>;
}

// Generate thumbnails for video assets
async function generateThumbnailsAutomatically(videoAssets: VideoAsset[]): Promise<ThumbnailGenerationResult> {
  if (videoAssets.length === 0) {
    return {
      success: true,
      processed: 0,
      total: 0,
      errors: []
    };
  }

  console.log(`[ThumbnailAPI] Starting thumbnail generation for ${videoAssets.length} video assets`);
  
  const errors: Array<{ assetId: string; assetName: string; error: string }> = [];

  // For now, we'll mark these as needing client-side processing
  // In a production environment, you might want to use a service like FFmpeg
  // or integrate with a thumbnail generation service
  
  for (const asset of videoAssets) {
    try {
      // For server-side processing, we would need additional libraries
      // For now, we'll mark this as requiring client-side generation
      console.log(`[ThumbnailAPI] Video asset ${asset.name} requires client-side thumbnail generation`);
      
      // The client will handle thumbnail generation when the user loads the ad uploader
      // This endpoint mainly serves to track which assets need thumbnails
      
      errors.push({
        assetId: asset.id,
        assetName: asset.name,
        error: 'Thumbnail generation will be handled client-side when user accesses ad uploader'
      });
      
    } catch (error) {
      console.error(`[ThumbnailAPI] Error processing ${asset.name}:`, error);
      errors.push({
        assetId: asset.id,
        assetName: asset.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  console.log(`[ThumbnailAPI] Thumbnail generation tracking complete. ${videoAssets.length} assets marked for client-side processing.`);
  
  return {
    success: true, // Success means we've marked them for processing
    processed: 0, // No server-side processing done
    total: videoAssets.length,
    errors
  };
}

export async function POST(req: NextRequest) {
  try {
    const { draftIds, brandId } = await req.json();

    if (!draftIds || !Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid draftIds array' 
      }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ 
        error: 'Missing brandId' 
      }, { status: 400 });
    }

    console.log(`[ThumbnailAPI] Processing thumbnail generation for drafts:`, draftIds);

    // Fetch video assets for the specified drafts
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('ad_draft_assets')
      .select('*')
      .in('ad_draft_id', draftIds)
      .eq('type', 'video');

    if (assetsError) {
      console.error(`[ThumbnailAPI] Failed to fetch video assets:`, assetsError);
      return NextResponse.json({ 
        error: 'Failed to fetch video assets',
        details: assetsError.message 
      }, { status: 500 });
    }

    const videoAssets: VideoAsset[] = (assets || []).map(asset => ({
      id: asset.id,
      name: asset.name,
      supabase_url: asset.supabase_url,
      type: asset.type,
      ad_draft_id: asset.ad_draft_id
    }));

    console.log(`[ThumbnailAPI] Found ${videoAssets.length} video assets across ${draftIds.length} drafts`);

    if (videoAssets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No video assets found requiring thumbnail generation',
        processed: 0,
        total: 0,
        errors: []
      });
    }

    // Generate thumbnails
    const result = await generateThumbnailsAutomatically(videoAssets);

    return NextResponse.json({
      success: result.success,
      message: `Thumbnail generation processed for ${result.total} video assets`,
      processed: result.processed,
      total: result.total,
      errors: result.errors,
      note: 'Thumbnail generation will be completed client-side when user accesses the ad uploader'
    });

  } catch (error) {
    console.error('[ThumbnailAPI] Error in thumbnail generation endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 