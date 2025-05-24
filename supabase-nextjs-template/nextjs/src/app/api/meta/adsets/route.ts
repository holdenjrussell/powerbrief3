import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { AdSet, MetaApiResponse } from '@/lib/types/meta'; // AdSet type import

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';

export async function GET(request: NextRequest) {
  console.log('=== Meta Ad Sets API Called ===');
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const adAccountId = searchParams.get('adAccountId'); // Optional: can fetch ad sets directly by campaign_id usually
  const campaignId = searchParams.get('campaignId');

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
  }
  // campaignId is the primary identifier for fetching ad sets under it.
  // adAccountId can be used for validation or if fetching ad sets across an account without specific campaign.
  if (!campaignId && !adAccountId) {
    return NextResponse.json({ error: 'Either Campaign ID or Ad Account ID is required' }, { status: 400 });
  }

  console.log(`Requested ad sets for brandId: ${brandId}, campaignId: ${campaignId}, adAccountId (optional): ${adAccountId}`);

  const supabase = await createSSRClient();

  try {
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag')
      .eq('id', brandId)
      .single();

    if (brandError || !brandData) {
      console.error('Error fetching brand or brand not found:', brandError);
      const message = brandError?.message || 'Brand not found or error fetching brand details.';
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (!brandData.meta_access_token || !brandData.meta_access_token_iv || !brandData.meta_access_token_auth_tag) {
      console.error('Meta token components are missing from brand data for ad sets:', brandData);
      return NextResponse.json({ error: 'Meta access token components not found. Ensure meta_access_token, meta_access_token_iv, and meta_access_token_auth_tag are set.' }, { status: 400 });
    }
    
    const validBrandData = brandData as {
        meta_access_token: string;
        meta_access_token_iv: string;
        meta_access_token_auth_tag: string;
    };

    const accessToken = await decryptToken({
        encryptedToken: validBrandData.meta_access_token,
        iv: validBrandData.meta_access_token_iv,
        authTag: validBrandData.meta_access_token_auth_tag
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to decrypt access token for ad sets.' }, { status: 500 });
    }

    // Ad sets are typically fetched under a campaign or an ad account.
    // If campaignId is provided, use it. Otherwise, use adAccountId (though less common for specific ad sets).
    const parentId = campaignId || adAccountId;
    const endpoint = campaignId ? `${campaignId}/adsets` : `${adAccountId}/adsets`;
    
    // Default fields for ad sets
    const fields = 'name,status,campaign_id,daily_budget,lifetime_budget,bid_strategy,start_time,end_time,created_time,updated_time,targeting,optimization_goal,billing_event';

    const metaApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${endpoint}?access_token=${accessToken}&fields=${fields}&limit=500`;
    console.log('Meta API URL (token redacted for ad sets):', metaApiUrl.replace(accessToken, '[REDACTED]'));

    const metaResponse = await fetch(metaApiUrl);
    const metaData: MetaApiResponse<AdSet> | { error?: { message: string } } = await metaResponse.json();

    if (!metaResponse.ok || ('error' in metaData && metaData.error)) {
      const errorMessage = ('error' in metaData && metaData.error?.message) ? metaData.error.message : 'Failed to fetch ad sets from Meta';
      console.error('Meta API Error fetching ad sets:', ('error' in metaData && metaData.error) ? metaData.error : 'Unknown Meta API error');
      return NextResponse.json({ error: errorMessage }, { status: metaResponse.status });
    }

    if ('data' in metaData) {
      const adSets: AdSet[] = metaData.data.map((adSetFromApi: Partial<AdSet> & { id: string; name: string; status: string; campaign_id: string; }): AdSet => ({
        id: adSetFromApi.id,
        name: adSetFromApi.name,
        status: adSetFromApi.status,
        campaign_id: adSetFromApi.campaign_id,
        daily_budget: adSetFromApi.daily_budget,
        lifetime_budget: adSetFromApi.lifetime_budget,
        bid_strategy: adSetFromApi.bid_strategy,
        start_time: adSetFromApi.start_time,
        end_time: adSetFromApi.end_time,
        created_time: adSetFromApi.created_time,
        updated_time: adSetFromApi.updated_time,
        targeting: adSetFromApi.targeting,
        // Map other fields as defined in your AdSet interface
      }));

      console.log(`Found ${adSets.length} ad sets for parent ID ${parentId}.`);
      return NextResponse.json(adSets, { status: 200 });
    } else {
      console.error('Meta API response did not contain data field for ad sets:', metaData);
      return NextResponse.json({ error: 'Invalid response structure from Meta API for ad sets.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in Meta Ad Sets API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 