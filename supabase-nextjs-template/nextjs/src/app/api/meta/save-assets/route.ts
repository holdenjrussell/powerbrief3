import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface SaveAssetsRequest {
  brandId: string;
  adAccountId?: string | null;
  facebookPageId?: string | null;
  instagramAccountId?: string | null;
  pixelId?: string | null;
}

interface BrandMetaUpdateData {
  updated_at: string;
  meta_ad_account_id?: string | null;
  meta_facebook_page_id?: string | null;
  meta_instagram_actor_id?: string | null; 
  meta_pixel_id?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveAssetsRequest = await request.json();
    const { brandId, adAccountId, facebookPageId, instagramAccountId, pixelId } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    const { data: brand, error: fetchError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching brand for update:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand' }, 
        { status: 500 }
      );
    }

    if (!brand && !fetchError) {
        console.log('Brand not found during save assets attempt:', brandId);
        return NextResponse.json(
            { error: 'Brand not found' },
            { status: 404 }
        );
    }

    const updateData: BrandMetaUpdateData = {
      updated_at: new Date().toISOString(),
    };
    if (adAccountId !== undefined) updateData.meta_ad_account_id = adAccountId;
    if (facebookPageId !== undefined) updateData.meta_facebook_page_id = facebookPageId;
    if (instagramAccountId !== undefined) updateData.meta_instagram_actor_id = instagramAccountId;
    if (pixelId !== undefined) updateData.meta_pixel_id = pixelId;
    
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError || !updatedBrand) {
      console.error('Error updating brand with Meta assets:', updateError);
      return NextResponse.json(
        { error: 'Failed to update brand with Meta assets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meta assets saved successfully',
      brand: updatedBrand
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving Meta assets:', errorMessage, error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
} 