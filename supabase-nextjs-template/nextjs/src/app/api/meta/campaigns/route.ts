import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { Campaign, MetaApiResponse } from '@/lib/types/meta';

const META_API_VERSION = process.env.META_API_VERSION || 'v22.0';

export async function GET(request: NextRequest) {
  console.log('=== Meta Campaigns API Called ===');
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const adAccountId = searchParams.get('adAccountId');

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
  }
  if (!adAccountId) {
    return NextResponse.json({ error: 'Ad Account ID is required' }, { status: 400 });
  }

  console.log(`Requested campaigns for brandId: ${brandId}, adAccountId: ${adAccountId}`);
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
      console.error('Meta token components are missing from brand data:', brandData);
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
      return NextResponse.json({ error: 'Failed to decrypt access token.' }, { status: 500 });
    }
    
    const fields = 'name,status,objective,buying_type,daily_budget,lifetime_budget,bid_strategy,start_time,stop_time,created_time,updated_time';
    const metaApiUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/campaigns?access_token=${accessToken}&fields=${fields}&limit=500`;
    console.log('Meta API URL (token redacted for campaigns):', metaApiUrl.replace(accessToken, '[REDACTED]'));

    const metaResponse = await fetch(metaApiUrl);
    const metaData: MetaApiResponse<Campaign> | { error?: { message: string, type?: string, code?: number, fbtrace_id?: string } } = await metaResponse.json();

    if (!metaResponse.ok || ('error' in metaData && metaData.error)) {
      const errorMessage = ('error' in metaData && metaData.error?.message) ? metaData.error.message : 'Failed to fetch campaigns from Meta';
      console.error('Meta API Error fetching campaigns:', ('error' in metaData && metaData.error) ? metaData.error : 'Unknown Meta API error');
      return NextResponse.json({ error: errorMessage }, { status: metaResponse.status });
    }

    if ('data' in metaData) {
        const campaigns: Campaign[] = metaData.data.map((campaignFromApi: Partial<Campaign> & { id: string; name: string; status: string; objective: string; }): Campaign => ({
            id: campaignFromApi.id,
            name: campaignFromApi.name,
            status: campaignFromApi.status,
            objective: campaignFromApi.objective,
            buying_type: campaignFromApi.buying_type,
            daily_budget: campaignFromApi.daily_budget,
            lifetime_budget: campaignFromApi.lifetime_budget,
            bid_strategy: campaignFromApi.bid_strategy,
            start_time: campaignFromApi.start_time,
            stop_time: campaignFromApi.stop_time,
            created_time: campaignFromApi.created_time,
            updated_time: campaignFromApi.updated_time,
        }));

        console.log(`Found ${campaigns.length} campaigns for ad account ${adAccountId}.`);
        return NextResponse.json(campaigns, { status: 200 });
    } else {
        console.error('Meta API response did not contain data field:', metaData);
        return NextResponse.json({ error: 'Invalid response structure from Meta API.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in Meta Campaigns API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 