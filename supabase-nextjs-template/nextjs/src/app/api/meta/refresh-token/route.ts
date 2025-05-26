import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken, encryptToken, calculateExpirationTimestamp } from '@/lib/utils/tokenEncryption';

export async function POST(request: NextRequest) {
  console.log('=== Meta Token Refresh API Called ===');
  
  try {
    const { brandId } = await request.json();

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Get brand and current token
    const supabase = await createSSRClient();
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand:', brandError);
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (!brand.meta_access_token || !brand.meta_access_token_iv || !brand.meta_access_token_auth_tag) {
      return NextResponse.json(
        { error: 'Brand not connected to Meta' },
        { status: 404 }
      );
    }

    // Check if token is close to expiring (within 7 days)
    if (brand.meta_access_token_expires_at) {
      const expirationDate = new Date(brand.meta_access_token_expires_at);
      const now = new Date();
      const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      console.log('Token expires in:', daysUntilExpiration, 'days');
      
      if (daysUntilExpiration > 7) {
        return NextResponse.json({
          success: true,
          message: 'Token is still valid, no refresh needed',
          daysUntilExpiration: Math.round(daysUntilExpiration)
        });
      }
    }

    // Decrypt the current access token
    const currentAccessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv,
      authTag: brand.meta_access_token_auth_tag
    });

    // Attempt to refresh the token
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;

    if (!metaAppId || !metaAppSecret) {
      console.error('Meta App ID or Secret is not configured');
      return NextResponse.json(
        { error: 'Meta app configuration missing' },
        { status: 500 }
      );
    }

    // Exchange current token for a new long-lived token
    const refreshUrl = `https://graph.facebook.com/v22.0/oauth/access_token`;
    const refreshParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: metaAppId,
      client_secret: metaAppSecret,
      fb_exchange_token: currentAccessToken,
    });

    console.log('Attempting to refresh Meta token...');
    const refreshResponse = await fetch(`${refreshUrl}?${refreshParams.toString()}`, {
      method: 'GET',
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok || refreshData.error) {
      console.error('Error refreshing token:', refreshData.error || refreshData);
      return NextResponse.json(
        { error: 'Failed to refresh token', details: refreshData.error },
        { status: 400 }
      );
    }

    const newAccessToken = refreshData.access_token;
    const newExpiresIn = refreshData.expires_in;
    
    console.log('New token received, expires in:', newExpiresIn, 'seconds (~', newExpiresIn ? Math.round(newExpiresIn / 86400) : 'unknown', 'days)');

    // Encrypt and store the new token
    const encryptedTokenData = encryptToken(newAccessToken);
    const expirationTimestamp = calculateExpirationTimestamp(newExpiresIn);

    const { error: updateError } = await supabase
      .from('brands')
      .update({
        meta_access_token: encryptedTokenData.encryptedToken,
        meta_access_token_iv: encryptedTokenData.iv,
        meta_access_token_auth_tag: encryptedTokenData.authTag,
        meta_access_token_expires_at: expirationTimestamp,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Error updating brand with refreshed token:', updateError);
      return NextResponse.json(
        { error: 'Failed to store refreshed token' },
        { status: 500 }
      );
    }

    console.log('Successfully refreshed Meta token for brand:', brandId);
    
    // Calculate days until expiration with proper null checking
    const daysUntilExpiration = newExpiresIn ? Math.round(newExpiresIn / 86400) : 60; // Default to 60 days if expires_in is null
    
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresIn: newExpiresIn,
      daysUntilExpiration: daysUntilExpiration
    });

  } catch (error) {
    console.error('Error in Meta token refresh API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 