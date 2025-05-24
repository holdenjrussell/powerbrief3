import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createSSRClient();

    // Clear all Meta-related fields for the brand
    const { error: updateError } = await supabase
      .from('brands')
      .update({
        meta_access_token: null,
        meta_access_token_iv: null,
        meta_access_token_auth_tag: null,
        meta_access_token_expires_at: null,
        meta_user_id: null,
        meta_ad_account_id: null,
        meta_facebook_page_id: null,
        meta_instagram_actor_id: null,
        meta_pixel_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Error disconnecting Meta from brand:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect Meta integration' },
        { status: 500 }
      );
    }

    console.log('Successfully disconnected Meta from brand:', brandId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Meta integration disconnected successfully'
    });

  } catch (error) {
    console.error('Error in Meta disconnect API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 