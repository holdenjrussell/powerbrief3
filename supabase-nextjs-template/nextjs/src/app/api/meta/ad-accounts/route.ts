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
    try {
      const decryptedAccessToken = decryptToken({
        encryptedToken: brand.meta_access_token,
        iv: brand.meta_access_token_iv!,
        authTag: brand.meta_access_token_auth_tag!
      });

      // Fetch ad accounts from Meta Graph API
      const metaApiUrl = `https://graph.facebook.com/v22.0/me/adaccounts?access_token=${decryptedAccessToken}&fields=id,name,account_status,account_id,business_name,currency,timezone_name`;
      
      const response = await fetch(metaApiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta API error response:', errorData);
        return NextResponse.json(
          { error: 'Failed to fetch ad accounts from Meta', details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`[Ad Accounts API] Retrieved ${data.data?.length || 0} ad accounts for brand ${brand.name}`);
      
      return NextResponse.json({
        success: true,
        adAccounts: data.data || []
      });

    } catch (decryptionError) {
      console.error('Token decryption failed:', decryptionError);
      return NextResponse.json(
        { error: 'Failed to decrypt access token', details: decryptionError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('General error in Meta ad accounts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 