import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

interface MetaPixel {
  id: string;
  name: string;
  creation_time?: string;
  // Add other relevant pixel fields if needed, e.g., last_fired_time
}

interface AdAccount {
  id: string; // This is the ad account ID, e.g., "act_xxxxxxxxxxxxxxx"
  account_id: string; // This is the numeric account_id, often the same as id without "act_"
  name: string;
  // Add other ad account fields if needed
}

export async function GET(request: NextRequest) {
  console.log('=== Meta Pixels API Called ===');
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    console.log('Requested brandId for pixels:', brandId);

    if (!brandId) {
      console.log('No brandId provided for pixels');
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
      console.log('Brand not found for pixels');
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (!brand.meta_access_token || !brand.meta_access_token_iv || !brand.meta_access_token_auth_tag) {
      console.log('Brand found but Meta token components are missing for pixels');
      return NextResponse.json(
        { error: 'Brand not fully connected to Meta' },
        { status: 404 }
      );
    }

    if (brand.meta_access_token_expires_at) {
      const expirationDate = new Date(brand.meta_access_token_expires_at);
      const now = new Date();
      if (expirationDate <= now) {
        console.log('Meta access token has expired for pixels');
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
      console.log('Token decryption successful for pixels, token length:', decryptedAccessToken.length);
    } catch (decryptionError) {
      console.error('Token decryption failed for pixels:', decryptionError);
      return NextResponse.json(
        { error: 'Failed to decrypt access token', details: (decryptionError as Error).message },
        { status: 500 }
      );
    }

    // Step 1: Fetch Ad Accounts
    console.log('Fetching ad accounts to find pixels...');
    const adAccountsApiUrl = `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${decryptedAccessToken}&fields=id,account_id,name`;
    const adAccountsResponse = await fetch(adAccountsApiUrl);

    if (!adAccountsResponse.ok) {
      const errorData = await adAccountsResponse.json();
      console.error('Failed to fetch ad accounts for pixels:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch ad accounts from Meta', details: errorData },
        { status: adAccountsResponse.status }
      );
    }

    const adAccountsData = await adAccountsResponse.json();
    const adAccounts: AdAccount[] = adAccountsData.data || [];
    console.log(`Found ${adAccounts.length} ad accounts.`);

    if (adAccounts.length === 0) {
      return NextResponse.json({ success: true, pixels: [] });
    }

    // Step 2: Fetch Pixels for each Ad Account
    const allPixels: MetaPixel[] = [];
    const pixelIds = new Set<string>(); // To keep track of unique pixel IDs

    console.log('Fetching pixels for each ad account...');
    for (const acc of adAccounts) {
      // Use acc.id which is typically act_{numeric_id}
      const pixelsApiUrl = `https://graph.facebook.com/v19.0/${acc.id}/adspixels?access_token=${decryptedAccessToken}&fields=id,name,creation_time,last_fired_time`;
      console.log(`Fetching pixels for ad account: ${acc.name} (${acc.id})`);
      const pixelsResponse = await fetch(pixelsApiUrl);

      if (!pixelsResponse.ok) {
        const errorData = await pixelsResponse.json();
        // Log error but continue to next ad account if one fails
        console.warn(`Failed to fetch pixels for ad account ${acc.id}:`, errorData);
        continue; 
      }

      const pixelsData = await pixelsResponse.json();
      const accountPixels: MetaPixel[] = pixelsData.data || [];
      console.log(`Found ${accountPixels.length} pixels for account ${acc.id}`);

      accountPixels.forEach(pixel => {
        if (!pixelIds.has(pixel.id)) {
          allPixels.push(pixel);
          pixelIds.add(pixel.id);
        }
      });
    }

    console.log(`Total unique pixels found: ${allPixels.length}`);
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