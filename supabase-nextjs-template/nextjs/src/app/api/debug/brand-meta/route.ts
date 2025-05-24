import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();
    
    // Use a more generic query to avoid TypeScript issues with missing column types
    const { data: brand, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (error) {
      console.error('Error fetching brand Meta data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch brand', details: error },
        { status: 500 }
      );
    }

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Return debug info without exposing sensitive data
    return NextResponse.json({
      success: true,
      brand: {
        id: brand.id,
        name: brand.name,
        meta_fields_status: {
          has_access_token: !!brand.meta_access_token,
          access_token_length: brand.meta_access_token?.length || 0,
          has_iv: !!brand.meta_access_token_iv,
          has_auth_tag: !!brand.meta_access_token_auth_tag,
          expires_at: brand.meta_access_token_expires_at,
          meta_user_id: brand.meta_user_id,
          meta_ad_account_id: brand.meta_ad_account_id,
          meta_facebook_page_id: brand.meta_facebook_page_id,
          meta_instagram_account_id: brand.meta_instagram_account_id,
          meta_pixel_id: brand.meta_pixel_id
        }
      }
    });

  } catch (error) {
    console.error('Error in debug brand Meta API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 