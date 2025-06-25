import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  PREDEFINED_METRICS, 
  META_FIELD_MAPPINGS,
  MetricFormula,
  DateRange
} from '@/lib/types/scorecard';

// Constants
const META_API_VERSION = 'v18.0';
const INSIGHTS_LIMIT = 100;

interface RefreshRequest {
  brandId: string;
  teamId?: string;
  dateRanges: DateRange[];
}

// Helper to calculate formula values
function calculateFormulaValue(
  formula: MetricFormula[], 
  data: Record<string, number>,
  dateRange: { start: string; end: string }
): number {
  console.log(`[Scorecard] Calculating formula for period ${dateRange.start} to ${dateRange.end}`);
  console.log('[Scorecard] Available data:', data);
  console.log('[Scorecard] Formula:', formula);
  
  const tokens: (number | string)[] = [];
  
  for (const item of formula) {
    if (item.type === 'metric') {
      const value = data[item.value] || 0;
      tokens.push(value);
      console.log(`[Scorecard] Metric ${item.value} = ${value}`);
    } else if (item.type === 'number') {
      tokens.push(parseFloat(item.value) || 0);
    } else if (item.type === 'operator') {
      tokens.push(item.value);
    }
  }

  // Basic evaluation (left to right, no precedence)
  if (tokens.length === 0) return 0;
  
  let result = tokens[0] as number;
  
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i] as string;
    const operand = tokens[i + 1] as number;
    
    switch (operator) {
      case '+':
        result += operand;
        break;
      case '-':
        result -= operand;
        break;
      case '*':
        result *= operand;
        break;
      case '/':
        result = operand !== 0 ? result / operand : 0;
        break;
    }
  }
  
  console.log(`[Scorecard] Formula result: ${result}`);
  return result;
}

// Fetch data from Meta API for a specific date range
async function fetchMetaInsightsForDateRange(
  adAccountId: string,
  accessToken: string,
  dateRange: { start: string; end: string },
  requiredFields: Set<string>
): Promise<Record<string, number>> {
  console.log(`[Scorecard] Fetching Meta insights for ${dateRange.start} to ${dateRange.end}`);
  
  // Build fields parameter
  const fields = Array.from(requiredFields).join(',');
  console.log(`[Scorecard] Requesting fields: ${fields}`);
  
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({
      since: dateRange.start,
      until: dateRange.end
    }),
    level: 'account',
    limit: INSIGHTS_LIMIT.toString()
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?${params}`;
  console.log(`[Scorecard] Meta API URL: ${url.replace(accessToken, '[REDACTED]')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Scorecard] Meta API error:`, data.error);
      throw new Error(data.error?.message || 'Failed to fetch Meta insights');
    }

    if (!data.data || data.data.length === 0) {
      console.log('[Scorecard] No data returned from Meta API');
      return {};
    }

    const insights = data.data[0]; // Account level data
    console.log('[Scorecard] Raw Meta API response:', JSON.stringify(insights, null, 2));
    
    // Process the response data
    const processedData: Record<string, number> = {};
    
    // Process each field we requested
    requiredFields.forEach(field => {
      const metricKey = Object.entries(META_FIELD_MAPPINGS).find(([, value]) => value === field)?.[0] || field;
      
      if (field.includes(':')) {
        // Handle action fields (e.g., actions:omni_purchase)
        const [actionType, actionName] = field.split(':');
        const actions = insights[actionType] || [];
        const action = actions.find((a: { action_type: string; value: string }) => a.action_type === actionName);
        processedData[metricKey] = action ? parseFloat(action.value) : 0;
        console.log(`[Scorecard] Processed action field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      } else if (field.includes('roas') && Array.isArray(insights[field])) {
        // Handle ROAS fields which might be arrays
        const roasArray = insights[field];
        const omniRoas = roasArray.find((item: { action_type: string; value: string }) => item.action_type === 'omni_purchase');
        processedData[metricKey] = omniRoas ? parseFloat(omniRoas.value) : 0;
        console.log(`[Scorecard] Processed ROAS field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      } else {
        // Direct fields
        processedData[metricKey] = parseFloat(insights[field]) || 0;
        console.log(`[Scorecard] Processed field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      }
    });

    return processedData;
  } catch (error) {
    console.error(`[Scorecard] Error fetching Meta insights:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Scorecard Refresh] Starting refresh request');
    
    const supabase = await createClient();
    const body: RefreshRequest = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId, teamId, dateRanges } = body;

    if (!brandId || !dateRanges || dateRanges.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Scorecard Refresh] Brand ID: ${brandId}, Team ID: ${teamId}`);
    console.log(`[Scorecard Refresh] Date ranges: ${dateRanges.length} periods`);

    // Get brand with Meta token
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('meta_access_token, meta_ad_account_id, meta_default_ad_account_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('[Scorecard Refresh] Brand not found:', brandError);
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.meta_access_token) {
      return NextResponse.json({ 
        error: 'Meta integration not configured for this brand' 
      }, { status: 400 });
    }

    // Determine which ad account to use
    let adAccountId = brand.meta_default_ad_account_id || brand.meta_ad_account_id;
    if (!adAccountId) {
      return NextResponse.json({ 
        error: 'No Meta ad account configured' 
      }, { status: 400 });
    }

    // Remove 'act_' prefix if it exists
    if (adAccountId.startsWith('act_')) {
      adAccountId = adAccountId.substring(4);
    }

    console.log(`[Scorecard Refresh] Using ad account: ${adAccountId}`);

    // Get existing metrics for this brand/team
    let query = supabase
      .from('scorecard_metrics')
      .select('*')
      .eq('brand_id', brandId);
    
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: existingMetrics, error: metricsError } = await query;

    if (metricsError) {
      console.error('[Scorecard Refresh] Error fetching metrics:', metricsError);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // If no metrics exist, create default ones
    const metrics = existingMetrics || [];
    if (metrics.length === 0) {
      console.log('[Scorecard Refresh] No existing metrics, creating defaults');
      
      // Create default metrics based on PREDEFINED_METRICS
      const defaultMetrics = PREDEFINED_METRICS.slice(0, 5); // Start with first 5 metrics
      
      for (const defaultMetric of defaultMetrics) {
        const { data: newMetric, error: createError } = await supabase
          .from('scorecard_metrics')
          .insert({
            brand_id: brandId,
            team_id: teamId,
            user_id: user.id,
            metric_key: defaultMetric.metric_key,
            display_name: defaultMetric.display_name,
            description: defaultMetric.description,
            metric_type: 'standard',
            calculation_formula: JSON.stringify(defaultMetric.formula),
            goal_operator: defaultMetric.goal_operator,
            is_percentage: defaultMetric.is_percentage || false,
            is_currency: defaultMetric.is_currency || false,
            decimal_places: defaultMetric.decimal_places || 2
          })
          .select()
          .single();

        if (!createError && newMetric) {
          metrics.push(newMetric);
        }
      }
    }

    console.log(`[Scorecard Refresh] Processing ${metrics.length} metrics`);

    // Collect all required Meta fields
    const requiredFields = new Set<string>();
    
    metrics.forEach(metric => {
      let formula: MetricFormula[] = [];
      
      // Parse formula from database
      if (metric.calculation_formula) {
        try {
          formula = JSON.parse(metric.calculation_formula);
        } catch (e) {
          console.error(`[Scorecard Refresh] Failed to parse formula for metric ${metric.metric_key}:`, e);
        }
      }
      
      // Extract required fields from formula
      formula.forEach(item => {
        if (item.type === 'metric' && item.value) {
          const metaField = META_FIELD_MAPPINGS[item.value];
          if (metaField) {
            if (metaField.includes(':')) {
              // For action fields, add the base field
              const [baseField] = metaField.split(':');
              requiredFields.add(baseField);
            } else {
              requiredFields.add(metaField);
            }
          }
        }
      });
    });

    // Always include these fields for ROAS calculations
    if (metrics.some(m => m.metric_key.includes('roas'))) {
      requiredFields.add('actions');
      requiredFields.add('action_values');
      requiredFields.add('purchase_roas');
      requiredFields.add('omni_purchase_roas');
      requiredFields.add('website_purchase_roas');
      requiredFields.add('mobile_app_purchase_roas');
    }

    console.log(`[Scorecard Refresh] Required Meta fields:`, Array.from(requiredFields));

    // Process each date range
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const dateRange of dateRanges) {
      const dateRangeStr = `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`;
      console.log(`[Scorecard Refresh] Processing date range: ${dateRangeStr}`);
      
      try {
        // Fetch data from Meta API for this date range
        const metaData = await fetchMetaInsightsForDateRange(
          adAccountId,
          brand.meta_access_token,
          {
            start: dateRange.start.toISOString().split('T')[0],
            end: dateRange.end.toISOString().split('T')[0]
          },
          requiredFields
        );

        // Calculate and store values for each metric
        for (const metric of metrics) {
          try {
            let formula: MetricFormula[] = [];
            
            // Parse formula from database
            if (metric.calculation_formula) {
              try {
                formula = JSON.parse(metric.calculation_formula);
              } catch (e) {
                console.error(`[Scorecard Refresh] Failed to parse formula for metric ${metric.metric_key}:`, e);
                continue;
              }
            }

            // Calculate value based on formula
            const value = calculateFormulaValue(
              formula, 
              metaData,
              {
                start: dateRange.start.toISOString().split('T')[0],
                end: dateRange.end.toISOString().split('T')[0]
              }
            );

            // Store in database
            const { error: upsertError } = await supabase
              .from('scorecard_data')
              .upsert({
                metric_id: metric.id,
                period_start: dateRange.start.toISOString().split('T')[0],
                period_end: dateRange.end.toISOString().split('T')[0],
                period_type: 'week',
                value: value,
                raw_data: metaData
              }, {
                onConflict: 'metric_id,period_start,period_end'
              });

            if (upsertError) {
              console.error(`[Scorecard Refresh] Error storing data for metric ${metric.metric_key}:`, upsertError);
              errorCount++;
            } else {
              successCount++;
              console.log(`[Scorecard Refresh] Stored value ${value} for metric ${metric.metric_key} in period ${dateRangeStr}`);
            }
          } catch (error) {
            console.error(`[Scorecard Refresh] Error processing metric ${metric.metric_key}:`, error);
            errorCount++;
          }
        }

        results.push({
          dateRange: dateRangeStr,
          success: true,
          metricsProcessed: metrics.length
        });
      } catch (error) {
        console.error(`[Scorecard Refresh] Error processing date range ${dateRangeStr}:`, error);
        results.push({
          dateRange: dateRangeStr,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount += metrics.length;
      }
    }

    console.log(`[Scorecard Refresh] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({ 
      success: true,
      summary: {
        totalMetrics: metrics.length,
        totalPeriods: dateRanges.length,
        successfulUpdates: successCount,
        failedUpdates: errorCount
      },
      results 
    });

  } catch (error) {
    console.error('[Scorecard Refresh] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}