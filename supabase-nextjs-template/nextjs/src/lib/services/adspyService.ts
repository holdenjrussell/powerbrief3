import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AdSpyCredentials {
  username: string;
  password: string;
}

export interface AdSpyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  userName: string;
  emailConfirmed: string;
  subscriptionValid: string;
  '.issued': string;
  '.expires': string;
}

export interface AdSpySearchParams {
  siteType?: 'facebook' | 'instagram';
  gender?: 'male' | 'female';
  ages?: number[];
  dailyLikes?: number[];
  totalLikes?: number[];
  mediaType?: 'video' | 'photo';
  createdBetween?: string[];
  seenBetween?: string[];
  affNetwork?: number;
  affId?: string;
  offerId?: string;
  username?: string;
  userId?: number;
  lang?: string;
  tech?: number[];
  buttons?: string[];
  countries?: string[];
  orderBy?: 'created_on_asc' | 'total_likes' | 'total_loves' | 'total_hahas' | 'total_wows' | 'total_sads' | 'total_angrys' | 'total_shares';
  page?: number;
  searches?: Array<{
    type: 'texts' | 'advertisers' | 'urls' | 'lp_urls' | 'comments' | 'page_text';
    value: string;
    locked: boolean;
  }>;
  details?: boolean;
}

export interface AdSpyAd {
  id: string;
  advertiser_name: string;
  advertiser_id: string;
  text: string;
  media_url: string;
  media_type: 'video' | 'photo';
  landing_page_url: string;
  created_on: string;
  first_seen: string;
  last_seen: string;
  total_likes: number;
  total_loves: number;
  total_shares: number;
  countries: string[];
  platform: 'facebook' | 'instagram';
  thumbnail_url?: string;
  duration?: number;
  // Additional metadata fields from AdSpy API
  [key: string]: string | number | string[] | undefined;
}

export interface AdSpySearchResult {
  ads: AdSpyAd[];
  total_count: number;
  page: number;
  per_page: number;
}

/**
 * Get AdSpy token for authentication
 */
export async function getAdSpyToken(credentials: AdSpyCredentials): Promise<AdSpyToken> {
  try {
    console.log('Attempting AdSpy authentication...');
    
    const response = await fetch('https://api.adspy.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'AdRipper/1.0',
      },
      body: new URLSearchParams({
        username: credentials.username,
        password: credentials.password,
        grant_type: 'password',
      }).toString(),
    });

    console.log('AdSpy response status:', response.status);
    console.log('AdSpy response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AdSpy authentication error response:', errorText);
      
      // Check if response is HTML (error page)
      if (errorText.includes('<html>') || errorText.includes('<!DOCTYPE')) {
        throw new Error(`AdSpy API returned an error page. Status: ${response.status}. This might indicate invalid credentials, API subscription issues, or server problems.`);
      }
      
      throw new Error(`AdSpy authentication failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('AdSpy returned non-JSON response:', responseText);
      throw new Error('AdSpy API returned non-JSON response. Please check your API subscription status.');
    }

    const tokenData = await response.json();
    console.log('AdSpy authentication successful');
    
    // Validate required fields
    if (!tokenData.access_token) {
      throw new Error('AdSpy response missing access_token');
    }

    return tokenData;
  } catch (error) {
    console.error('AdSpy authentication error:', error);
    
    if (error instanceof Error) {
      // Add more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to AdSpy API. Please check your internet connection.');
      }
      throw error;
    }
    
    throw new Error('Unknown error during AdSpy authentication');
  }
}

/**
 * Search AdSpy database
 */
export async function searchAdSpy(
  token: string,
  searchParams: AdSpySearchParams
): Promise<AdSpySearchResult> {
  try {
    console.log('Searching AdSpy with params:', searchParams);
    
    const response = await fetch('https://api.adspy.com/api/ad', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'AdRipper/1.0',
      },
      body: JSON.stringify(searchParams),
    });

    console.log('AdSpy search response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AdSpy search error response:', errorText);
      
      if (response.status === 401) {
        throw new Error('AdSpy authentication expired. Please re-authenticate.');
      }
      
      if (errorText.includes('<html>') || errorText.includes('<!DOCTYPE')) {
        throw new Error(`AdSpy API returned an error page. Status: ${response.status}. Please check your API subscription.`);
      }
      
      throw new Error(`AdSpy search failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('AdSpy search returned non-JSON response:', responseText);
      throw new Error('AdSpy API returned non-JSON response during search.');
    }

    const searchResult = await response.json();
    console.log('AdSpy search successful, found', searchResult.ads?.length || 0, 'ads');
    
    return searchResult;
  } catch (error) {
    console.error('AdSpy search error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to AdSpy API during search.');
      }
      throw error;
    }
    
    throw new Error('Unknown error during AdSpy search');
  }
}

/**
 * Store AdSpy credentials for a brand (encrypted)
 */
export async function storeAdSpyCredentials(
  brandId: string,
  credentials: AdSpyCredentials
): Promise<void> {
  // In a real implementation, you'd want to encrypt the password
  // For now, we'll store it as-is (not recommended for production)
  const { error } = await supabase
    .from('brands')
    .update({
      adspy_username: credentials.username,
      adspy_password_encrypted: credentials.password, // Should be encrypted
      adspy_enabled: true,
    })
    .eq('id', brandId);

  if (error) {
    throw new Error(`Failed to store AdSpy credentials: ${error.message}`);
  }
}

/**
 * Get AdSpy credentials for a brand
 */
export async function getAdSpyCredentials(brandId: string): Promise<AdSpyCredentials | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('adspy_username, adspy_password_encrypted')
    .eq('id', brandId)
    .single();

  if (error || !data?.adspy_username) {
    return null;
  }

  return {
    username: data.adspy_username,
    password: data.adspy_password_encrypted, // Should be decrypted
  };
}

/**
 * Store/update AdSpy token for a brand
 */
export async function storeAdSpyToken(
  brandId: string,
  token: AdSpyToken
): Promise<void> {
  const expiresAt = new Date(token['.expires']).toISOString();

  const { error } = await supabase
    .from('brands')
    .update({
      adspy_token: token.access_token,
      adspy_token_expires_at: expiresAt,
    })
    .eq('id', brandId);

  if (error) {
    throw new Error(`Failed to store AdSpy token: ${error.message}`);
  }
}

/**
 * Get valid AdSpy token for a brand (refresh if needed)
 */
export async function getValidAdSpyToken(brandId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('brands')
    .select('adspy_token, adspy_token_expires_at, adspy_username, adspy_password_encrypted')
    .eq('id', brandId)
    .single();

  if (error || !data?.adspy_username) {
    return null;
  }

  // Check if token is still valid
  if (data.adspy_token && data.adspy_token_expires_at) {
    const expiresAt = new Date(data.adspy_token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresAt.getTime() > now.getTime() + bufferTime) {
      return data.adspy_token;
    }
  }

  // Token expired or doesn't exist, get a new one
  try {
    const credentials = {
      username: data.adspy_username,
      password: data.adspy_password_encrypted, // Should be decrypted
    };

    const tokenResponse = await getAdSpyToken(credentials);
    await storeAdSpyToken(brandId, tokenResponse);
    return tokenResponse.access_token;
  } catch (error) {
    console.error('Failed to refresh AdSpy token:', error);
    return null;
  }
}

/**
 * Save AdSpy search to history
 */
export async function saveAdSpySearch(
  brandId: string,
  userId: string,
  searchParams: AdSpySearchParams,
  searchName?: string,
  totalResults?: number
): Promise<void> {
  const { error } = await supabase
    .from('adspy_searches')
    .insert({
      brand_id: brandId,
      user_id: userId,
      search_params: searchParams,
      search_name: searchName,
      total_results: totalResults,
      page_searched: searchParams.page || 1,
    });

  if (error) {
    throw new Error(`Failed to save AdSpy search: ${error.message}`);
  }
}

/**
 * Get AdSpy search history for a brand
 */
export async function getAdSpySearchHistory(brandId: string) {
  const { data, error } = await supabase
    .from('adspy_searches')
    .select('*')
    .eq('brand_id', brandId)
    .order('last_used_at', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to get AdSpy search history: ${error.message}`);
  }

  return data;
}

/**
 * Download and store AdSpy ad content to Supabase
 */
export async function downloadAdSpyAd(
  brandId: string,
  userId: string,
  ad: AdSpyAd
): Promise<void> {
  try {
    // Download the media file
    const mediaResponse = await fetch(ad.media_url);
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }

    const mediaBlob = await mediaResponse.blob();
    const fileExtension = ad.media_type === 'video' ? '.mp4' : '.jpg';
    const fileName = `adspy_${ad.id}_${Date.now()}${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('social-media-content')
      .upload(filePath, mediaBlob, {
        contentType: ad.media_type === 'video' ? 'video/mp4' : 'image/jpeg',
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('social-media-content')
      .getPublicUrl(filePath);

    // Store metadata in database
    const { error: dbError } = await supabase
      .from('social_media_content')
      .insert({
        brand_id: brandId,
        user_id: userId,
        source_url: ad.landing_page_url || ad.media_url,
        platform: ad.platform,
        title: ad.text || `Ad by ${ad.advertiser_name}`,
        description: ad.text,
        content_type: ad.media_type === 'video' ? 'video' : 'image',
        file_url: urlData.publicUrl,
        file_name: fileName,
        file_size: mediaBlob.size,
        thumbnail_url: ad.thumbnail_url,
        source_type: 'adspy',
        adspy_ad_id: ad.id,
        adspy_metadata: {
          advertiser_name: ad.advertiser_name,
          advertiser_id: ad.advertiser_id,
          created_on: ad.created_on,
          first_seen: ad.first_seen,
          last_seen: ad.last_seen,
          total_likes: ad.total_likes,
          total_loves: ad.total_loves,
          total_shares: ad.total_shares,
          countries: ad.countries,
          duration: ad.duration,
        },
      });

    if (dbError) {
      throw new Error(`Failed to store ad metadata: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Error downloading AdSpy ad:', error);
    throw error;
  }
}

/**
 * Test AdSpy API connection and credentials
 */
export async function testAdSpyConnection(credentials: AdSpyCredentials): Promise<{ success: boolean; message: string; subscriptionValid?: boolean }> {
  try {
    console.log('Testing AdSpy connection...');
    
    // First test authentication
    const tokenResponse = await getAdSpyToken(credentials);
    
    if (!tokenResponse.access_token) {
      return {
        success: false,
        message: 'Authentication failed: No access token received'
      };
    }

    // Check subscription status
    const subscriptionValid = tokenResponse.subscriptionValid === 'True';
    if (!subscriptionValid) {
      return {
        success: false,
        message: 'AdSpy subscription is not valid. Please check your AdSpy API subscription.',
        subscriptionValid: false
      };
    }

    // Test a simple search to verify API access
    const testSearchParams: AdSpySearchParams = {
      siteType: 'facebook',
      page: 1,
      orderBy: 'total_loves'
    };

    await searchAdSpy(tokenResponse.access_token, testSearchParams);

    return {
      success: true,
      message: 'AdSpy connection successful',
      subscriptionValid: true
    };

  } catch (error) {
    console.error('AdSpy connection test failed:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
} 