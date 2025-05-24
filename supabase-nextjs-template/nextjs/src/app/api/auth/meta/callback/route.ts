import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { encryptToken, calculateExpirationTimestamp } from '@/lib/utils/tokenEncryption';

export async function GET(request: NextRequest) {
  console.log('Meta OAuth Callback Triggered');

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const metaAppId = process.env.META_APP_ID;
  const metaAppSecret = process.env.META_APP_SECRET;
  // The redirect URI used in the initial OAuth request. It MUST match exactly.
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/meta/callback`;

  if (error) {
    console.error('Meta OAuth Error:', { error, errorDescription });
    // Consider redirecting to a more user-friendly error page
    return NextResponse.redirect(new URL('/app/powerbrief?meta_error=true', request.url));
  }

  if (!code) {
    console.warn('Meta OAuth Callback: No code received.');
    return NextResponse.redirect(new URL('/app/powerbrief?meta_error=no_code', request.url));
  }

  if (!metaAppId || !metaAppSecret) {
    console.error('Meta App ID or Secret is not configured on the server.');
    return NextResponse.redirect(new URL('/app/powerbrief?meta_error=config_error', request.url));
  }

  // --- State Validation (CSRF Protection) ---
  // TODO: Implement robust state validation.
  // For now, we'll parse the state to get brandId and userId if they were included.
  // In a production app, you should generate a unique state, store it (e.g., in a short-lived cookie or server-side session),
  // and then compare the received state with the stored one.
  let brandIdFromState: string | null = null;
  let userIdFromState: string | null = null;

  if (state) {
    try {
      const decodedState = JSON.parse(decodeURIComponent(state));
      brandIdFromState = decodedState.brandId;
      userIdFromState = decodedState.userId;
      console.log('Decoded state:', { brandIdFromState, userIdFromState });
      // Here you would typically compare 'state' with a value stored before the redirect.
      // For simplicity, we are currently just extracting values from it.
    } catch (e) {
      console.error('Error parsing state parameter:', e);
      // Potentially a sign of tampering or an issue with state encoding.
      // You might want to handle this as an error.
      return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState || ''}?meta_error=state_mismatch`, request.url));
    }
  }
  // For now, we proceed even if state parsing fails or state is not present, but this should be stricter.

  // --- Exchange Code for Access Token ---
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
  const tokenParams = new URLSearchParams({
    client_id: metaAppId,
    redirect_uri: redirectUri,
    client_secret: metaAppSecret,
    code: code,
  });

  try {
    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
      method: 'GET', // Meta expects GET for this endpoint
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error exchanging code for token:', tokenData.error || tokenData);
      return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState || ''}?meta_error=token_exchange_failed`, request.url));
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // Typically in seconds
    console.log('Meta Access Token Received:', accessToken);
    console.log('Expires In (seconds):', expiresIn);

    // --- Encrypt and Store Token ---
    if (brandIdFromState) {
      try {
        console.log('Attempting to store Meta token for brandId:', brandIdFromState);
        
        // Encrypt the access token
        const encryptedTokenData = encryptToken(accessToken);
        console.log('Token encrypted successfully');
        
        // Calculate expiration timestamp
        const expirationTimestamp = calculateExpirationTimestamp(expiresIn);
        console.log('Expiration timestamp calculated:', expirationTimestamp);
        
        // Get Supabase client
        const supabase = await createSSRClient();
        console.log('Supabase client created');
        
        // First, let's check if the brand exists
        const { data: existingBrand, error: fetchError } = await supabase
          .from('brands')
          .select('*')
          .eq('id', brandIdFromState)
          .single();
        
        if (fetchError) {
          console.error('Error fetching brand:', fetchError);
          if (fetchError.code === 'PGRST116') {
            console.error('Brand not found in database:', brandIdFromState);
            return NextResponse.redirect(new URL(`/app/powerbrief?meta_error=brand_not_found`, request.url));
          }
        }
        
        console.log('Existing brand found:', existingBrand ? 'Yes' : 'No');
        if (existingBrand) {
          console.log('Brand name:', existingBrand.name);
          console.log('Brand user_id:', existingBrand.user_id);
        }
        
        // Fetch user's Meta profile to get user_id if available
        let metaUserId = null;
        try {
          const meResponse = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
          const meData = await meResponse.json();
          metaUserId = meData.id;
          console.log('Meta User ID:', metaUserId);
        } catch (meError) {
          console.warn('Could not fetch Meta user ID:', meError);
        }
        
        // Update the brand with encrypted token data
        console.log('Updating brand with Meta token data...');
        const { error: updateError } = await supabase
          .from('brands')
          .update({
            meta_access_token: encryptedTokenData.encryptedToken,
            meta_access_token_iv: encryptedTokenData.iv,
            meta_access_token_auth_tag: encryptedTokenData.authTag,
            meta_access_token_expires_at: expirationTimestamp,
            meta_user_id: metaUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', brandIdFromState);

        if (updateError) {
          console.error('Error updating brand with Meta token:', updateError);
          return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState}?meta_error=database_error`, request.url));
        }

        console.log('Successfully stored encrypted Meta token for brand:', brandIdFromState);
        
        // Redirect to the brand page with success
        return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState}?meta_connected=true`, request.url));
        
      } catch (encryptionError) {
        console.error('Error encrypting or storing Meta token:', encryptionError);
        return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState}?meta_error=encryption_error`, request.url));
      }
    } else {
      // Fallback redirect if brandId wasn't in state
      return NextResponse.redirect(new URL('/app/powerbrief?meta_connected=true', request.url));
    }

  } catch (fetchError) {
    console.error('Network error during token exchange:', fetchError);
    return NextResponse.redirect(new URL(`/app/powerbrief/${brandIdFromState || ''}?meta_error=network_error`, request.url));
  }
} 