import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

interface MetaPixel {
  id: string;
  name: string;
  creation_time?: string;
  last_fired_time?: string;
  // Add other relevant pixel fields if needed, e.g., last_fired_time
}

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
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_access_token_expires_at, meta_user_id')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Error fetching brand for pixels:', brandError);
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

    if (!brand.meta_access_token || !brand.meta_access_token_iv || !brand.meta_access_token_auth_tag) {
      return NextResponse.json(
        { error: 'Brand not fully connected to Meta' },
        { status: 404 }
      );
    }

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

    let decryptedAccessToken;
    try {
      decryptedAccessToken = decryptToken({
        encryptedToken: brand.meta_access_token,
        iv: brand.meta_access_token_iv,
        authTag: brand.meta_access_token_auth_tag
      });
    } catch (decryptionError) {
      console.error('Token decryption failed for pixels:', decryptionError);
      return NextResponse.json(
        { error: 'Failed to decrypt access token', details: (decryptionError as Error).message },
        { status: 500 }
      );
    }

    // First, get ad accounts for this user
    const adAccountsApiUrl = `https://graph.facebook.com/v22.0/me/adaccounts?access_token=${decryptedAccessToken}&fields=id,account_id,name`;
    
    const adAccountsResponse = await fetch(adAccountsApiUrl);
    
    if (!adAccountsResponse.ok) {
        const errorText = await adAccountsResponse.text();
        console.error('Error response from Meta Ad Accounts API:', errorText);
        throw new Error(`Meta Ad Accounts API error: ${adAccountsResponse.status} ${adAccountsResponse.statusText}`);
    }
    
    const adAccountsData = await adAccountsResponse.json();
    
    if (!adAccountsData.data || !Array.isArray(adAccountsData.data)) {
        console.error('Unexpected ad accounts response structure:', adAccountsData);
        throw new Error('Invalid ad accounts response structure');
    }
    
    // Then get pixels for each ad account
    const allPixels: MetaPixel[] = [];
    const seenPixelIds = new Set<string>();
    
    console.log(`[Pixels API] Fetching pixels from ${adAccountsData.data.length} ad accounts...`);
    
    for (const acc of adAccountsData.data) {
        const pixelsApiUrl = `https://graph.facebook.com/v22.0/${acc.id}/adspixels?access_token=${decryptedAccessToken}&fields=id,name,creation_time,last_fired_time`;
        const pixelsResponse = await fetch(pixelsApiUrl);

        if (!pixelsResponse.ok) {
          const errorData = await pixelsResponse.json();
          // Log error but continue to next ad account if one fails
          console.warn(`Failed to fetch pixels for ad account ${acc.id}:`, errorData);
          continue; 
        }

        const pixelsData = await pixelsResponse.json();
        const accountPixels: MetaPixel[] = pixelsData.data || [];

        // Only add pixels we haven't seen before to prevent duplicates
        accountPixels.forEach(pixel => {
          if (!seenPixelIds.has(pixel.id)) {
            seenPixelIds.add(pixel.id);
            allPixels.push(pixel);
          }
        });
    }

    console.log(`[Pixels API] Found ${allPixels.length} unique pixels across all accounts`);
    return NextResponse.json({
      success: true,
      pixels: allPixels
    });

  } catch (error) {
    console.error('General error in Meta pixels API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 