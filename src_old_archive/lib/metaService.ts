import type { NewMetric, FormulaItem } from '@/app/app/scorecard/page';

interface FetchedPeriodData {
  [baseMetaMetricId: string]: number; // Store base Meta metrics as numbers after parsing
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

// // Map our metric IDs to the Meta API format expected by the existing endpoint - THIS MAPPING IS NOW DONE IN BACKEND IF NEEDED
// function mapMetricIdToApiFormat(metricId: string): string { ... }

/**
 * Fetches insights data from the Meta API via existing scorecard API routes for a given metric configuration and date ranges.
 * This version sends all required base metrics in one call to the backend.
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
    for (const range of dateRanges) {
      results[range.label] = { error: 'Metric is not configured for Live Meta data.' };
    }
    return results;
  }

  const baseMetaMetricKeys: string[] = [];
  if (metricConfig.formula && metricConfig.formula.length > 0) {
    metricConfig.formula.forEach(item => {
      if (item.type === 'metric' && item.value) {
        if (!baseMetaMetricKeys.includes(item.value)) {
          baseMetaMetricKeys.push(item.value);
        }
      }
    });
  }

  if (baseMetaMetricKeys.length === 0) {
    for (const range of dateRanges) {
      results[range.label] = { error: 'No Meta metrics specified in the formula to fetch.' };
    }
    return results;
  }

  // Prepare the relevant parts of metricConfig to send to the backend
  const metricConfigPayload = {
    formula: metricConfig.formula, // Send formula for backend to know which metrics are involved
    campaignNameFilters: metricConfig.campaignNameFilters,
    adSetNameFilters: metricConfig.adSetNameFilters,
    adNameFilters: metricConfig.adNameFilters,
    periodInterval: metricConfig.periodInterval, // Though backend gets specific date range, this might be useful context
    // baseMetaMetricKeys: baseMetaMetricKeys, // Sending this explicitly
  };

  // Process each date range
  for (const dateRange of dateRanges) {
    try {
      const requestPayload = {
        brandId,
        metricConfigPayload, // Contains filters, formula (for base keys)
        baseMetaMetricKeys, // Explicitly send base keys to fetch
        dateRange: {
          start: formatDate(dateRange.start),
          end: formatDate(dateRange.end),
        },
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
        console.error(`Error fetching Meta data for period ${dateRange.label}:`, responseData.error, responseData.details);
        results[dateRange.label] = { 
          error: `Failed to fetch data: ${responseData.error || response.statusText}`,
          details: responseData.details || 'Error response from backend.'
        };
      } else if (responseData.success && responseData.data) {
        // Assuming responseData.data is already in FetchedPeriodData format: { spend: 100, impressions: 1000 }
        results[dateRange.label] = responseData.data as FetchedPeriodData;
      } else {
        results[dateRange.label] = { 
          error: 'Received unexpected data structure from backend.',
          details: JSON.stringify(responseData)
        };
      }
    } catch (error: unknown) {
      console.error(`Failed to fetch Meta insights for period ${dateRange.label}:`, error);
      results[dateRange.label] = { 
        error: 'Failed to make request to backend', 
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
    campaignNameFilters: [{id: '1', name: 'Campaign Name Contains', operator: 'contains', value: 'Summer Sale', case_sensitive: false}], // Corrected operator
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