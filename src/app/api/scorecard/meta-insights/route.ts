import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';
import { 
  CampaignFilter,
  AdSetFilter,
  AdFilter,
  TimePeriod
} from '@/lib/types/scorecard';
import crypto from 'crypto'; // For hashing

// Define available Meta API fields
// The 'name' is the actual field name in Meta API
// 'action_type' is used for 'actions' field to specify which action
// 'is_standard_metric' helps differentiate direct fields from those inside 'actions'
const AVAILABLE_META_FIELDS: Record<string, { name: string; action_type?: string; is_standard_metric: boolean; components_for_average?: string[] }> = {
  spend: { name: 'spend', is_standard_metric: true },
  impressions: { name: 'impressions', is_standard_metric: true },
  link_click: { name: 'link_clicks', is_standard_metric: true }, // Meta field is link_clicks (plural)
  clicks: { name: 'clicks', is_standard_metric: true }, // General clicks
  cpc: { name: 'cpc', is_standard_metric: true, components_for_average: ['spend', 'clicks'] }, // spend / clicks
  cpm: { name: 'cpm', is_standard_metric: true, components_for_average: ['spend', 'impressions'] }, // (spend / impressions) * 1000
  ctr: { name: 'ctr', is_standard_metric: true, components_for_average: ['clicks', 'impressions'] }, // clicks / impressions
  purchase_roas: { name: 'purchase_roas', action_type: 'omni_purchase', is_standard_metric: false, components_for_average: ['revenue', 'spend'] }, // revenue / spend
  revenue: { name: 'action_values', action_type: 'omni_purchase', is_standard_metric: false }, // Example for 'actions' field
  purchases: { name: 'actions', action_type: 'omni_purchase', is_standard_metric: false }, // Example, adjust action_type as needed
  video_thruplay_watched_actions: { name: 'video_thruplay_watched_actions', is_standard_metric: true }, // Check if this is direct or in 'actions'
  video_3s_watched_actions: { name: 'video_3sec_watched_actions', is_standard_metric: true }, // Check if this is direct or in 'actions', Meta often uses video_pXX_watched_actions
  reach: { name: 'reach', is_standard_metric: true },
  frequency: { name: 'frequency', is_standard_metric: true },
  // Add other metrics as needed, ensure 'name' matches Meta API field
  // For 'actions' based metrics, specify 'action_type'
};

interface MetricConfigPayload {
  // formula: any[]; // Not strictly needed by backend if baseMetaMetricKeys are sent
  campaignNameFilters?: CampaignFilter[];
  adSetNameFilters?: AdSetFilter[];
  adNameFilters?: AdFilter[];
  // periodInterval: TimePeriod; // dateRange is more specific
}

interface MetaInsightsRequest {
  brandId: string;
  baseMetaMetricKeys: string[]; // e.g., ['spend', 'impressions']
  metricConfigPayload: MetricConfigPayload;
  dateRange: {
    start: string;
    end: string;
  };
}

// This structure is what Meta API returns per item in 'data' array
interface MetaDataItem {
  [key: string]: any; // Allows for dynamic fields like spend, impressions
  campaign_name?: string;
  campaign_id?: string;
  adset_name?: string;
  adset_id?: string;
  ad_name?: string;
  ad_id?: string;
  actions?: Array<{ action_type: string; value: string; [key: string]: any }>; // Meta's 'actions' is an array
  purchase_roas?: Array<{action_type: string; value: string; [key: string]: any}>; // purchase_roas is also often an action
  date_start?: string; // Will be present with time_increment=1
  date_stop?: string;  // Will be present with time_increment=1
}

// Helper to generate a stable hash for filter configurations
function generateFilterHash(config: MetricConfigPayload): string {
  const relevantFilters = {
    campaign: config.campaignNameFilters || [],
    adset: config.adSetNameFilters || [],
    ad: config.adNameFilters || [],
  };
  // Sort filters to ensure consistent hash despite order changes
  for (const key in relevantFilters) {
    relevantFilters[key as keyof typeof relevantFilters].sort((a,b) => a.id.localeCompare(b.id));
  }
  const stringified = JSON.stringify(relevantFilters);
  return crypto.createHash('md5').update(stringified).digest('hex');
}

// Helper to get all dates in a range
function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  currentDate.setUTCHours(0,0,0,0); // Normalize to UTC start of day
  endDate.setUTCHours(0,0,0,0); // Normalize to UTC start of day

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

export async function POST(request: NextRequest) {
  const supabase = await createSSRClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: MetaInsightsRequest = await request.json();
    const { brandId, baseMetaMetricKeys: requestedBaseKeys, metricConfigPayload, dateRange: requestedDateRange } = body;

    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_ad_account_id')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand || !brand.meta_access_token) {
      return NextResponse.json({ error: 'Meta integration not configured' }, { status: 400 });
    }
    if (!brand.meta_access_token_iv || !brand.meta_access_token_auth_tag) {
      return NextResponse.json({ error: 'Meta token decryption components missing' }, { status: 400 });
    }
    if (!brand.meta_ad_account_id) {
      return NextResponse.json({ error: 'No ad account ID configured' }, { status: 400 });
    }

    const accessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv,
      authTag: brand.meta_access_token_auth_tag
    });
    const filterHash = generateFilterHash(metricConfigPayload);
    
    const overallStartDate = new Date(requestedDateRange.start);
    const overallEndDate = new Date(requestedDateRange.end);
    const allDatesInOverallRange = getDatesInRange(overallStartDate, overallEndDate);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setUTCHours(0,0,0,0);

    const dailyDataStore: Record<string, Record<string, number>> = {}; // { 'YYYY-MM-DD': { 'spend': 10, 'impressions': 100 }} 
    const datesToFetchFromMeta: string[] = [];

    // 1. Check cache for dates older than 7 days
    for (const dateObj of allDatesInOverallRange) {
      const dateStr = dateObj.toISOString().split('T')[0];
      dailyDataStore[dateStr] = {}; // Initialize for the day
      if (dateObj < sevenDaysAgo) {
        const { data: cachedData, error: cacheErr } = await supabase
          .from('scorecard_meta_cache')
          .select('base_metric_key, value')
          .eq('brand_id', brandId)
          .eq('metric_config_hash', filterHash)
          .eq('date', dateStr)
          .in('base_metric_key', requestedBaseKeys);
        
        if (cacheErr) console.warn(`Cache read error for ${dateStr}:`, cacheErr.message);
        
        let allKeysFoundForDate = true;
        if (cachedData && cachedData.length > 0) {
          requestedBaseKeys.forEach(key => {
            const found = cachedData.find(c => c.base_metric_key === key);
            if (found && typeof found.value === 'number') {
              dailyDataStore[dateStr][key] = found.value;
            } else {
              allKeysFoundForDate = false;
            }
          });
        }
        if (!cachedData || cachedData.length === 0 || !allKeysFoundForDate || cachedData.length < requestedBaseKeys.length) {
          if (!datesToFetchFromMeta.includes(dateStr)) datesToFetchFromMeta.push(dateStr);
        }
      } else {
        // Date is within last 7 days, mark for fresh fetch
        if (!datesToFetchFromMeta.includes(dateStr)) datesToFetchFromMeta.push(dateStr);
      }
    }

    // 2. Fetch from Meta for dates that need it (recent or not in cache)
    if (datesToFetchFromMeta.length > 0) {
      datesToFetchFromMeta.sort(); // Fetch in chronological order
      const metaFetchStartDate = datesToFetchFromMeta[0];
      const metaFetchEndDate = datesToFetchFromMeta[datesToFetchFromMeta.length - 1];

      let metaApiLevel: 'account' | 'campaign' | 'adset' | 'ad' = 'account';
      const metaNameFilters: any[] = []; // Only name filters here, base impressions filter added below
      if (metricConfigPayload.adNameFilters?.length) { metaApiLevel = 'ad'; metricConfigPayload.adNameFilters.forEach(f => metaNameFilters.push({ field: 'ad.name', operator: f.operator.toUpperCase(), value: f.value }));}
      else if (metricConfigPayload.adSetNameFilters?.length) { metaApiLevel = 'adset'; metricConfigPayload.adSetNameFilters.forEach(f => metaNameFilters.push({ field: 'adset.name', operator: f.operator.toUpperCase(), value: f.value }));}
      else if (metricConfigPayload.campaignNameFilters?.length) { metaApiLevel = 'campaign'; metricConfigPayload.campaignNameFilters.forEach(f => metaNameFilters.push({ field: 'campaign.name', operator: f.operator.toUpperCase(), value: f.value }));}

      const fieldsForMeta = new Set<string>();
      let needsActionsForMeta = false;
      let needsPurchaseRoasForMeta = false;

      requestedBaseKeys.forEach(key => {
        const fieldInfo = AVAILABLE_META_FIELDS[key];
        if (fieldInfo) {
          if (fieldInfo.is_standard_metric) fieldsForMeta.add(fieldInfo.name);
          else {
            if (key === 'purchase_roas') needsPurchaseRoasForMeta = true;
            else needsActionsForMeta = true; // For other action-based like revenue, purchases
          }
          // If components are needed for average calculation, ensure they are fetched
          fieldInfo.components_for_average?.forEach(compKey => {
            const compFieldInfo = AVAILABLE_META_FIELDS[compKey];
            if (compFieldInfo) {
              if (compFieldInfo.is_standard_metric) fieldsForMeta.add(compFieldInfo.name);
              else {
                 if (compKey === 'purchase_roas') needsPurchaseRoasForMeta = true;
                 else needsActionsForMeta = true;
              }
            }
          });
        }
      });
      if (needsActionsForMeta) fieldsForMeta.add('actions');
      if (needsPurchaseRoasForMeta) fieldsForMeta.add('purchase_roas');
      if (metaApiLevel === 'campaign') { fieldsForMeta.add('campaign_name'); fieldsForMeta.add('campaign_id'); }
      // ... add other level-specific fields if needed for logs/debug: adset_name, ad_name etc.
      
      if (fieldsForMeta.size === 0) return NextResponse.json({ error: 'No valid Meta fields to fetch' }, { status: 400 });

      const metaParams = new URLSearchParams({
        access_token: accessToken,
        fields: Array.from(fieldsForMeta).join(','),
        level: metaApiLevel,
        time_range: JSON.stringify({ since: metaFetchStartDate, until: metaFetchEndDate }),
        time_increment: '1', // DAILY DATA!
        filtering: JSON.stringify([{ field: 'impressions', operator: 'GREATER_THAN', value: 0 }, ...metaNameFilters]),
        limit: '2000' 
      });
      
      const metaResponse = await fetch(`https://graph.facebook.com/v23.0/${brand.meta_ad_account_id}/insights?${metaParams}`);
      if (!metaResponse.ok) {
        const errorData = await metaResponse.json();
        console.error('Meta API error during daily fetch:', errorData);
        return NextResponse.json({ error: 'Failed daily fetch from Meta API', details: errorData.error?.message || errorData }, { status: metaResponse.status });
      }
      const metaResult = await metaResponse.json();
      const dailyRawData: MetaDataItem[] = metaResult.data || [];
      const cacheUpserts: any[] = [];

      dailyRawData.forEach(dailyItem => {
        const itemDate = dailyItem.date_start;
        if (!itemDate || !dailyDataStore[itemDate]) return; // Should have been initialized

        requestedBaseKeys.forEach(key => {
          const fieldInfo = AVAILABLE_META_FIELDS[key];
          if (!fieldInfo) return;
          let val = 0;
          if (fieldInfo.is_standard_metric) {
            val = parseFloat(dailyItem[fieldInfo.name] || '0');
          } else if (fieldInfo.name === 'actions' && dailyItem.actions) {
            const action = dailyItem.actions.find(a => a.action_type === fieldInfo.action_type);
            val = parseFloat(action?.value || '0');
          } else if (fieldInfo.name === 'purchase_roas' && dailyItem.purchase_roas) {
            const roasAction = dailyItem.purchase_roas.find(a => a.action_type === fieldInfo.action_type);
            val = parseFloat(roasAction?.value || '0'); 
          } else if (fieldInfo.name === 'action_values' && dailyItem.actions) {
            const actionVal = dailyItem.actions.find(a => a.action_type === fieldInfo.action_type);
            val = parseFloat(actionVal?.value || '0');
          }
          dailyDataStore[itemDate][key] = val;
          cacheUpserts.push({
            brand_id: brandId, metric_config_hash: filterHash, date: itemDate,
            base_metric_key: key, value: val, fetched_at: new Date().toISOString()
          });
        });
      });
      if (cacheUpserts.length > 0) {
        const { error: upsertError } = await supabase.from('scorecard_meta_cache').upsert(cacheUpserts, {
          onConflict: 'brand_id,metric_config_hash,date,base_metric_key'
        });
        if (upsertError) console.warn('Cache upsert error:', upsertError.message);
      }
    }

    // 3. Aggregate daily data for the overall requested period for the frontend
    const aggregatedPeriodTotals: Record<string, number> = {};
    requestedBaseKeys.forEach(key => aggregatedPeriodTotals[key] = 0);
    
    // Temporary store for components if we need to recalculate averages
    const componentDailyStore: Record<string, Record<string, number[]>> = {}; // { baseKey: { componentKey: [daily_vals] }}

    allDatesInOverallRange.forEach(dateObj => {
      const dateStr = dateObj.toISOString().split('T')[0];
      if (dailyDataStore[dateStr]) {
        requestedBaseKeys.forEach(key => {
          aggregatedPeriodTotals[key] += (dailyDataStore[dateStr][key] || 0);

          // Store daily values of components for potential average recalculation
          const fieldInfo = AVAILABLE_META_FIELDS[key];
          if (fieldInfo?.components_for_average) {
            if (!componentDailyStore[key]) componentDailyStore[key] = {};
            fieldInfo.components_for_average.forEach(compKey => {
                if (!componentDailyStore[key][compKey]) componentDailyStore[key][compKey] = [];
                componentDailyStore[key][compKey].push(dailyDataStore[dateStr][compKey] || 0);
            });
          }
        });
      }
    });
    
    // Recalculate averages if components were fetched
    requestedBaseKeys.forEach(key => {
        const fieldInfo = AVAILABLE_META_FIELDS[key];
        if (fieldInfo?.components_for_average && componentDailyStore[key]) {
            const components = fieldInfo.components_for_average;
            if (components.length === 2) {
                const numeratorKey = components[0];
                const denominatorKey = components[1];
                const sumNumerator = componentDailyStore[key][numeratorKey]?.reduce((s, v) => s + v, 0) || 0;
                const sumDenominator = componentDailyStore[key][denominatorKey]?.reduce((s, v) => s + v, 0) || 0;

                if (key === 'cpm') {
                     aggregatedPeriodTotals[key] = sumDenominator > 0 ? (sumNumerator / sumDenominator) * 1000 : 0;
                } else {
                     aggregatedPeriodTotals[key] = sumDenominator > 0 ? sumNumerator / sumDenominator : 0;
                }
            }    
        }
    });

    return NextResponse.json({ success: true, data: aggregatedPeriodTotals });

  } catch (error) {
    console.error('Error in Meta Insights API (outer try-catch):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown internal server error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
} 