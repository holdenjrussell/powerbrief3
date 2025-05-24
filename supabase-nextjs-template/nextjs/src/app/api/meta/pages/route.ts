import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

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

    // Get brand and decrypt token
    const supabase = await createSSRClient();
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at, meta_user_id')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Error fetching brand:', brandError);
      return NextResponse.json(
        { error: 'Failed to fetch brand', details: brandError.message },
        { status: 500 }
      );
    }

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (!brand.meta_access_token) {
      return NextResponse.json(
        { error: 'Brand not connected to Meta' },
        { status: 404 }
      );
    }

    // Check if token is not expired
    if (brand.meta_access_token_expires_at) {
      const expirationDate = new Date(brand.meta_access_token_expires_at);
      const now = new Date();
      
      if (expirationDate <= now) {
        return NextResponse.json(
          { error: 'Meta access token has expired' },
          { status: 401 }
        );
      }
    }

    // Decrypt the access token
    const decryptedAccessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv!,
      authTag: brand.meta_access_token_auth_tag!
    });

    // Fetch Facebook pages from Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${decryptedAccessToken}&fields=id,name,category,tasks,access_token,instagram_business_account{id,name,username}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch pages from Meta' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      pages: data.data || []
    });

  } catch (error) {
    console.error('Error fetching Meta pages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 