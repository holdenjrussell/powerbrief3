import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface MetaInsightsRequest {
  brandId: string;
  metricConfigPayload: {
    formula: any[];
    campaignNameFilters: any[];
    adSetNameFilters: any[];
    adNameFilters: any[];
  };
  baseMetaMetricKeys: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: MetaInsightsRequest = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId, metricConfigPayload, baseMetaMetricKeys, dateRange } = body;

    if (!brandId || !dateRange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get brand with Meta token
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_ad_account_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.meta_access_token || !brand.meta_ad_account_id) {
      return NextResponse.json({ 
        error: 'Meta integration not configured for this brand' 
      }, { status: 400 });
    }

    // Map our metric keys to Meta API fields
    const metaFieldsMap: Record<string, string> = {
      'spend': 'spend',
      'impressions': 'impressions',
      'clicks': 'clicks',
      'cpm': 'cpm',
      'cpc': 'cpc',
      'ctr': 'ctr',
      'conversions': 'conversions',
      'purchase_roas': 'purchase_roas:omni_purchase',
      'purchases': 'actions:omni_purchase',
      'purchase_value': 'action_values:omni_purchase',
      'link_clicks': 'inline_link_clicks',
      'unique_link_clicks': 'unique_inline_link_clicks',
      'cost_per_unique_link_click': 'cost_per_unique_inline_link_click'
    };

    // Build fields for Meta API request
    const fieldsSet = new Set<string>();
    
    baseMetaMetricKeys.forEach(key => {
      const metaField = metaFieldsMap[key] || key;
      if (metaField.includes(':')) {
        // For action fields like 'actions:omni_purchase', we need to request the base field
        const [baseField] = metaField.split(':');
        fieldsSet.add(baseField);
      } else {
        fieldsSet.add(metaField);
      }
    });
    
    const fields = Array.from(fieldsSet).join(',');

    // Build Meta API URL
    const metaApiUrl = `https://graph.facebook.com/v18.0/act_${brand.meta_ad_account_id}/insights`;
    
    // Build filters if any
    const filtering: any[] = [];
    
    if (metricConfigPayload.campaignNameFilters?.length > 0) {
      metricConfigPayload.campaignNameFilters.forEach(filter => {
        if (filter.value) {
          filtering.push({
            field: 'campaign.name',
            operator: filter.operator === 'contains' ? 'CONTAIN' : 'NOT_CONTAIN',
            value: filter.value
          });
        }
      });
    }

    // Make request to Meta API
    const params = new URLSearchParams({
      access_token: brand.meta_access_token,
      fields,
      time_range: JSON.stringify({
        since: dateRange.start,
        until: dateRange.end
      }),
      level: 'account',
      ...(filtering.length > 0 && { filtering: JSON.stringify(filtering) })
    });

    const response = await fetch(`${metaApiUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Meta API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to fetch Meta insights',
        details: errorData.error?.message || 'Unknown error'
      }, { status: response.status });
    }

    const metaData = await response.json();
    
    // Process the response data
    if (metaData.data && metaData.data.length > 0) {
      const insights = metaData.data[0]; // Account level data
      
      // Map Meta API response back to our metric keys
      const processedData: Record<string, number> = {};
      
      baseMetaMetricKeys.forEach(key => {
        const metaField = metaFieldsMap[key];
        if (metaField?.includes(':')) {
          // Handle action fields like 'actions:omni_purchase' or 'purchase_roas:omni_purchase'
          const [actionType, actionName] = metaField.split(':');
          const actions = insights[actionType] || [];
          const action = Array.isArray(actions) 
            ? actions.find((a: { action_type: string; value: string }) => a.action_type === actionName)
            : null;
          processedData[key] = action ? parseFloat(action.value) : 0;
        } else if (metaField && insights[metaField] !== undefined) {
          processedData[key] = parseFloat(insights[metaField]) || 0;
        } else {
          processedData[key] = 0;
        }
      });

      // Store the data in scorecard_data table for caching
      const { data: metrics } = await supabase
        .from('scorecard_metrics')
        .select('id')
        .eq('brand_id', brandId);

      if (metrics && metrics.length > 0) {
        // Store data for each metric
        const dataToInsert = metrics.map(metric => ({
          metric_id: metric.id,
          period_start: dateRange.start,
          period_end: dateRange.end,
          value: JSON.stringify(processedData) // Store all data as JSON
        }));

        await supabase
          .from('scorecard_data')
          .upsert(dataToInsert, {
            onConflict: 'metric_id,period_start,period_end'
          });
      }

      return NextResponse.json({ 
        success: true, 
        data: processedData 
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {} 
    });

  } catch (error) {
    console.error('Error in POST /api/scorecard/meta-insights:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const metricId = searchParams.get('metricId');
    const dateRange = searchParams.get('dateRange');
    const period = searchParams.get('period');

    if (!metricId) {
      return NextResponse.json({ error: 'Metric ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get metric data
    const { data: metricData, error } = await supabase
      .from('scorecard_data')
      .select('*')
      .eq('metric_id', metricId)
      .order('period_start', { ascending: false });

    if (error) {
      console.error('Error fetching metric data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: metricData || [] });
  } catch (error) {
    console.error('Error in GET /api/scorecard/meta-insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 