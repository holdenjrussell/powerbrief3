import type { NewMetric } from '@/app/app/scorecard/page';

interface FetchedPeriodData {
  [metricId: string]: number; // Store metrics as numbers after parsing
}

export interface FetchMetaInsightsResult {
  [periodLabel: string]: FetchedPeriodData | { error: string; details?: string };
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// Helper to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Map our metric IDs to the Meta API format expected by the existing endpoint
function mapMetricIdToApiFormat(metricId: string): string {
  const metricMapping: Record<string, string> = {
    'spend': 'spend',
    'impressions': 'impressions', 
    'link_clicks': 'link_click',
    'cpc': 'cpc',
    'cpm': 'cpm',
    'ctr': 'ctr',
    'purchase_roas': 'website_purchase_roas',
    'revenue': 'website_purchase_revenue',
    'purchases': 'purchases',
    'video_thruplay_watched_actions': 'video_thruplay_watched_actions',
    'video_3s_watched_actions': 'video_3_sec_watched_actions',
    'reach': 'reach',
    'frequency': 'frequency',
    'cpp': 'cpc', // Cost per purchase maps to cpc for now
  };
  
  return metricMapping[metricId] || metricId;
}

/**
 * Fetches insights data from the Meta API via existing scorecard API routes for a given metric configuration and date ranges.
 *
 * @param metricConfig The configuration of the scorecard metric.
 * @param dateRanges An array of date ranges for which to fetch data.
 * @param brandId The brand ID to use for API authentication.
 * @returns A promise that resolves to FetchMetaInsightsResult.
 */
export async function fetchMetaInsights(
  metricConfig: NewMetric,
  dateRanges: DateRange[],
  brandId: string
): Promise<FetchMetaInsightsResult> {
  const results: FetchMetaInsightsResult = {};

  if (metricConfig.dataSource !== 'live_meta') {
    // Should not happen if called correctly, but as a safeguard
    for (const range of dateRanges) {
      results[range.label] = { error: 'Metric is not configured for Live Meta data.' };
    }
    return results;
  }

  const metaMetricIdsToFetch: string[] = [];
  if (metricConfig.formula && metricConfig.formula.length > 0) {
    metricConfig.formula.forEach(item => {
      if (item.type === 'metric' && item.value) {
        if (!metaMetricIdsToFetch.includes(item.value)) {
          metaMetricIdsToFetch.push(item.value);
        }
      }
    });
  }

  if (metaMetricIdsToFetch.length === 0) {
    for (const range of dateRanges) {
      results[range.label] = { error: 'No Meta metrics specified in the formula to fetch.' };
    }
    return results;
  }

  // Process each date range
  for (const dateRange of dateRanges) {
    try {
      const aggregatedData: FetchedPeriodData = {};
      let hasError = false;
      let errorMessage = '';

      // Fetch each metric individually since the existing API expects one metric at a time
      for (const metricId of metaMetricIdsToFetch) {
        try {
          const mappedMetricId = mapMetricIdToApiFormat(metricId);
          
          const requestPayload = {
            metricId: mappedMetricId,
            brandId,
            timePeriod: metricConfig.periodInterval || 'weekly',
            dateRange: {
              start: formatDate(dateRange.start),
              end: formatDate(dateRange.end),
            },
            campaignFilters: metricConfig.campaignNameFilters || []
          };

          const response = await fetch('/api/scorecard/meta-insights', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(requestPayload),
          });

          const responseData = await response.json();

          if (!response.ok || responseData.error) {
            console.error(`Error fetching metric ${metricId}:`, responseData.error);
            hasError = true;
            errorMessage = `Failed to fetch ${metricId}: ${responseData.error || response.statusText}`;
            break; // Stop processing other metrics for this period if one fails
          }

          if (responseData.success && responseData.data && typeof responseData.data.value === 'number') {
            aggregatedData[metricId] = responseData.data.value;
          } else {
            // If no data returned, set to 0
            aggregatedData[metricId] = 0;
          }
        } catch (metricError) {
          console.error(`Error fetching metric ${metricId}:`, metricError);
          hasError = true;
          errorMessage = `Failed to fetch ${metricId}: ${metricError instanceof Error ? metricError.message : 'Unknown error'}`;
          break;
        }
      }

      if (hasError) {
        results[dateRange.label] = { 
          error: errorMessage,
          details: 'One or more metrics failed to load'
        };
      } else {
        results[dateRange.label] = aggregatedData;
      }

    } catch (error: unknown) {
      console.error(`Failed to fetch Meta insights for period ${dateRange.label}:`, error);
      results[dateRange.label] = { 
        error: 'Failed to fetch data', 
        details: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  return results;
}

// Example usage (for illustration, would be in a component or another service):
/*
async function example() {
  const sampleMetric: NewMetric = {
    id: 'metric1',
    title: 'Custom ROAS',
    dataSource: 'live_meta',
    formula: [
      { type: 'metric', value: 'spend' },
      { type: 'operator', value: '/' },
      { type: 'metric', value: 'purchase_roas' } // example, might be 'actions' with type 'offline_conversion'
    ],
    periodInterval: 'weekly',
    showTotal: true,
    showAverage: true,
    showGoal: true,
    goalUnit: 'percentage',
    goalOrientation: 'ge_goal',
    goalValue: 200,
    trailingCalculation: 'average',
    allowManualOverride: false,
    campaignNameFilters: [{id: '1', name: 'Campaign Name Contains', condition: 'contains', value: 'Summer Sale'}],
    adSetNameFilters: [],
    adNameFilters: [],
  };

  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const sampleDateRanges: DateRange[] = [
    { start: lastWeek, end: today, label: 'Last 7 Days' }
  ];

  const brandId = 'YOUR_BRAND_ID'; // Replace with actual brand ID

  try {
    const insights = await fetchMetaInsights(sampleMetric, sampleDateRanges, brandId);
    console.log('Fetched Insights:', insights);
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// example();
*/ 