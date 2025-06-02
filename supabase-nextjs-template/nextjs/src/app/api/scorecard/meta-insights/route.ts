import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { 
  CampaignFilter,
  TimePeriod
} from '@/lib/types/scorecard';

// Define available Meta API fields based on user's requirements
const AVAILABLE_META_FIELDS = {
  spend: { name: 'spend', type: 'currency' },
  website_purchase_revenue: { name: 'action_values', action_type: 'omni_purchase', type: 'currency' },
  website_purchase_roas: { name: 'purchase_roas', type: 'number' },
  link_click: { name: 'link_click', type: 'number' },
  impressions: { name: 'impressions', type: 'number' },
  ctr: { name: 'ctr', type: 'percentage' },
  purchases: { name: 'actions', action_type: 'purchase', type: 'number' },
  video_3_sec_watched_actions: { name: 'video_3_sec_watched_actions', type: 'number' },
  video_thruplay_watched_actions: { name: 'video_thruplay_watched_actions', type: 'number' },
  cpc: { name: 'cpc', type: 'currency' }
};

interface MetaInsightsRequest {
  metricId: string;
  brandId: string;
  timePeriod: TimePeriod;
  dateRange: {
    start: string;
    end: string;
  };
  campaignFilters?: CampaignFilter[];
}

interface MetaCampaignData {
  campaign_name?: string;
  campaign_id?: string;
  spend?: string;
  impressions?: string;
  link_click?: string;
  ctr?: string;
  cpc?: string;
  video_3_sec_watched_actions?: { value: string };
  video_thruplay_watched_actions?: { value: string };
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MetaInsightsRequest = await request.json();
    const { metricId, brandId, dateRange, campaignFilters } = body;

    // Get brand to retrieve Meta access token
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_ad_account_id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand || !brand.meta_access_token) {
      return NextResponse.json({ 
        error: 'Meta integration not configured for this brand' 
      }, { status: 400 });
    }

    // Check that we have all required decryption components
    if (!brand.meta_access_token_iv || !brand.meta_access_token_auth_tag) {
      return NextResponse.json({ 
        error: 'Meta token decryption components missing' 
      }, { status: 400 });
    }

    // Decrypt Meta access token using the proper encryption utilities
    const accessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv,
      authTag: brand.meta_access_token_auth_tag
    });

    // For now, mock the metric data since scorecard_metrics table doesn't exist yet
    const mockMetric = {
      id: metricId,
      meta_metric_name: metricId, // Use the requested metric ID instead of hardcoding 'spend'
      meta_level: 'campaign'
    };

    // Build Meta API URL
    const adAccountId = brand.meta_ad_account_id;
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'No ad account ID configured for this brand' 
      }, { status: 400 });
    }

    const metaApiUrl = `https://graph.facebook.com/v23.0/${adAccountId}/insights`; // Updated to v23.0

    // Prepare fields for Meta API
    const metaField = AVAILABLE_META_FIELDS[mockMetric.meta_metric_name as keyof typeof AVAILABLE_META_FIELDS];
    if (!metaField) {
      return NextResponse.json({ 
        error: `Unsupported Meta metric: ${mockMetric.meta_metric_name}` 
      }, { status: 400 });
    }

    // Build fields parameter
    const fields = ['campaign_name', 'campaign_id', metaField.name];
    if ('action_type' in metaField && metaField.action_type) {
      fields.push(`actions`);
    }

    // Build parameters
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: fields.join(','),
      level: mockMetric.meta_level || 'campaign',
      time_range: JSON.stringify({
        since: dateRange.start,
        until: dateRange.end
      }),
      filtering: JSON.stringify([
        { field: 'impressions', operator: 'GREATER_THAN', value: 0 }
      ])
    });

    // Fetch data from Meta API
    const metaResponse = await fetch(`${metaApiUrl}?${params}`);
    
    if (!metaResponse.ok) {
      const errorData = await metaResponse.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to fetch data from Meta API',
        details: errorData.error?.message 
      }, { status: 500 });
    }

    const metaData = await metaResponse.json();

    // Apply campaign filters if provided
    let filteredData: MetaCampaignData[] = metaData.data || [];
    
    if (campaignFilters && campaignFilters.length > 0) {
      filteredData = filteredData.filter((campaign: MetaCampaignData) => {
        const campaignName = campaign.campaign_name?.toLowerCase() || '';
        
        return campaignFilters.every(filter => {
          const filterValue = filter.case_sensitive ? filter.value : filter.value.toLowerCase();
          const checkValue = filter.case_sensitive ? campaign.campaign_name || '' : campaignName;
          
          switch (filter.operator) {
            case 'contains':
              return checkValue.includes(filterValue);
            case 'not_contains':
              return !checkValue.includes(filterValue);
            case 'starts_with':
              return checkValue.startsWith(filterValue);
            case 'ends_with':
              return checkValue.endsWith(filterValue);
            case 'equals':
              return checkValue === filterValue;
            case 'not_equals':
              return checkValue !== filterValue;
            default:
              return true;
          }
        });
      });
    }

    // Calculate aggregated metric value
    let totalValue = 0;
    
    for (const campaign of filteredData) {
      let value = 0;
      
      switch (mockMetric.meta_metric_name) {
        case 'spend':
          value = parseFloat(campaign.spend || '0');
          break;
        case 'website_purchase_revenue':
          const purchaseActions = campaign.actions?.find((a) => a.action_type === 'omni_purchase');
          value = parseFloat(purchaseActions?.value || '0');
          break;
        case 'website_purchase_roas':
          const revenue = campaign.actions?.find((a) => a.action_type === 'omni_purchase')?.value || '0';
          const spend = parseFloat(campaign.spend || '0');
          value = spend > 0 ? parseFloat(revenue) / spend : 0;
          break;
        case 'link_click':
          value = parseInt(campaign.link_click || '0');
          break;
        case 'impressions':
          value = parseInt(campaign.impressions || '0');
          break;
        case 'ctr':
          value = parseFloat(campaign.ctr || '0');
          break;
        case 'purchases':
          const purchaseAction = campaign.actions?.find((a) => a.action_type === 'purchase');
          value = parseInt(purchaseAction?.value || '0');
          break;
        case 'video_3_sec_watched_actions':
          value = parseInt(campaign.video_3_sec_watched_actions?.value || '0');
          break;
        case 'video_thruplay_watched_actions':
          value = parseInt(campaign.video_thruplay_watched_actions?.value || '0');
          break;
        case 'cpc':
          value = parseFloat(campaign.cpc || '0');
          break;
      }
      
      totalValue += value;
    }

    // For ROAS and rate metrics, calculate average instead of sum
    if (['website_purchase_roas', 'ctr', 'cpc'].includes(mockMetric.meta_metric_name)) {
      totalValue = filteredData.length > 0 ? totalValue / filteredData.length : 0;
    }

    // For now, return the calculated value without storing
    // Once the migration is applied, we can store in scorecard_metric_data table
    
    return NextResponse.json({
      success: true,
      data: {
        value: totalValue,
        campaigns_included: filteredData.length,
        total_campaigns: metaData.data?.length || 0,
        period: {
          start: dateRange.start,
          end: dateRange.end
        }
      }
    });

  } catch (error) {
    console.error('Error in Meta Insights API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 