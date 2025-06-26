import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  PREDEFINED_METRICS, 
  META_FIELD_MAPPINGS,
  MetricFormula,
  DateRange
} from '@/lib/types/scorecard';
import { decryptToken } from '@/lib/utils/tokenEncryption';

// Constants
const META_API_VERSION = 'v18.0';

interface RefreshRequest {
  brandId: string;
  teamId?: string;
  dateRanges: DateRange[];
}

// Removed unused interface

// Remove unused interface

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

// Fetch account-level data from Meta API
async function fetchAccountLevelData(
  adAccountId: string,
  accessToken: string,
  dateRange: { start: string; end: string },
  requiredFields: Set<string>
): Promise<Record<string, number>> {
  console.log(`[Scorecard] Fetching account-level data for ${dateRange.start} to ${dateRange.end}`);
  
  // Build fields parameter - only include non-action fields for account level
  const fieldsSet = new Set<string>();
  requiredFields.forEach(field => {
    if (field.includes(':')) {
      // For action fields, only add the base field to the API request
      const [baseField] = field.split(':');
      fieldsSet.add(baseField);
    } else {
      fieldsSet.add(field);
    }
  });
  const fields = Array.from(fieldsSet).join(',');
  console.log(`[Scorecard] Requesting account-level fields: ${fields}`);

  // Make request to Meta API at account level
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
    level: 'account'
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?${params}`;
  console.log(`[Scorecard] Account-level API URL: ${url.replace(accessToken, '[REDACTED]')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Scorecard] Meta API error:`, data.error);
      
      // Check for specific error types
      if (data.error?.code === 190) {
        throw new Error('Invalid or expired Meta access token. Please reconnect your Meta account in brand settings.');
      } else if (data.error?.code === 100) {
        throw new Error(`Invalid Meta API request: ${data.error.message}`);
      } else if (data.error?.code === 200) {
        throw new Error('Permission denied. Please ensure your Meta account has the necessary permissions.');
      }
      
      throw new Error(data.error?.message || 'Failed to fetch Meta insights');
    }

    if (!data.data || data.data.length === 0) {
      console.log('[Scorecard] No data returned from Meta API');
      return {};
    }

    // Process the response data
    const processedData: Record<string, number> = {};
    const insights = data.data[0];
    console.log('[Scorecard] Raw Meta API response:', JSON.stringify(insights, null, 2));
    
    // Process each field we requested
    requiredFields.forEach(field => {
      const metricKey = Object.entries(META_FIELD_MAPPINGS).find(([, value]) => value === field)?.[0] || field;
      
      if (field.includes(':')) {
        // Handle action fields (e.g., actions:omni_purchase)
        const [actionType, actionName] = field.split(':');
        const actions = insights[actionType] || [];
        
        // For purchase actions, check both "omni_purchase" and "purchase"
        let action = actions.find((a: { action_type: string; value: string }) => a.action_type === actionName);
        
        // If looking for omni_purchase but not found, try regular purchase
        if (!action && actionName === 'omni_purchase') {
          action = actions.find((a: { action_type: string; value: string }) => a.action_type === 'purchase');
          if (action) {
            console.log(`[Scorecard] Using "purchase" action type as fallback for "omni_purchase"`);
          }
        }
        
        processedData[metricKey] = action ? parseFloat(action.value) : 0;
        console.log(`[Scorecard] Processed action field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      } else if (field === 'purchase_roas' && Array.isArray(insights[field])) {
        // Handle purchase_roas field which might be an array
        const roasArray = insights[field];
        let purchaseRoas = roasArray.find((item: { action_type: string; value: string }) => item.action_type === 'omni_purchase');
        
        // If omni_purchase not found, try regular purchase
        if (!purchaseRoas) {
          purchaseRoas = roasArray.find((item: { action_type: string; value: string }) => item.action_type === 'purchase');
          if (purchaseRoas) {
            console.log(`[Scorecard] Using "purchase" ROAS as fallback for "omni_purchase" ROAS`);
          }
        }
        
        processedData[metricKey] = purchaseRoas ? parseFloat(purchaseRoas.value) : 0;
        console.log(`[Scorecard] Processed ROAS field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      } else if (field === 'purchase_roas' && typeof insights[field] === 'number') {
        // Handle purchase_roas as a direct number
        processedData[metricKey] = insights[field] || 0;
        console.log(`[Scorecard] Processed ROAS field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      } else if (field === 'actions' || field === 'action_values') {
        // Don't process actions and action_values as direct fields - they're arrays
        console.log(`[Scorecard] Skipping array field ${field} - will be processed via specific action types`);
      } else {
        // Direct fields
        processedData[metricKey] = parseFloat(insights[field]) || 0;
        console.log(`[Scorecard] Processed field ${field} -> ${metricKey} = ${processedData[metricKey]}`);
      }
    });

    return processedData;
  } catch (error) {
    console.error(`[Scorecard] Error fetching account-level data:`, error);
    throw error;
  }
}

// Fetch campaign-level data for metrics that need filtering
async function fetchCampaignLevelData(
  adAccountId: string,
  accessToken: string,
  dateRange: { start: string; end: string },
  requiredFields: Set<string>,
  campaignFilters: Array<{operator: string; value: string; case_sensitive?: boolean}>
): Promise<Record<string, number>> {
  console.log(`[Scorecard] Fetching campaign-level data for ${dateRange.start} to ${dateRange.end}`);
  
  // Build fields parameter
  const fieldsSet = new Set<string>(['campaign_name', 'campaign_id', 'impressions']);
  requiredFields.forEach(field => {
    if (field.includes(':')) {
      const [baseField] = field.split(':');
      fieldsSet.add(baseField);
    } else {
      fieldsSet.add(field);
    }
  });
  const fields = Array.from(fieldsSet).join(',');
  console.log(`[Scorecard] Requesting campaign-level fields: ${fields}`);

  // Build filters
  const filtering: Array<{field: string; operator: string; value: string}> = [];
  campaignFilters.forEach(filter => {
    let operator = 'CONTAIN';
    switch (filter.operator) {
      case 'contains':
        operator = 'CONTAIN';
        break;
      case 'not_contains':
        operator = 'NOT_CONTAIN';
        break;
      case 'starts_with':
        operator = 'STARTS_WITH';
        break;
      case 'ends_with':
        operator = 'ENDS_WITH';
        break;
      case 'equals':
        operator = 'EQUAL';
        break;
    }
    
    filtering.push({
      field: 'campaign.name',
      operator,
      value: filter.value
    });
  });

  console.log(`[Scorecard] Applying ${filtering.length} campaign filters`);

  // Make request to Meta API at campaign level
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
    level: 'campaign',
    ...(filtering.length > 0 && { filtering: JSON.stringify(filtering) })
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?${params}`;
  console.log(`[Scorecard] Campaign-level API URL: ${url.replace(accessToken, '[REDACTED]')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Scorecard] Meta API error:`, data.error);
      throw new Error(data.error?.message || 'Failed to fetch Meta insights');
    }

    if (!data.data || data.data.length === 0) {
      console.log('[Scorecard] No campaigns returned from Meta API');
      return {};
    }

    // Process and aggregate campaign data
    const aggregatedData: Record<string, number> = {};
    console.log(`[Scorecard] Processing ${data.data.length} campaigns`);
    
    // Filter out campaigns with 0 impressions
    const activeCampaigns = data.data.filter((campaign: Record<string, unknown>) => {
      const impressions = parseFloat((campaign.impressions as string) || '0');
      return impressions > 0;
    });
    
    console.log(`[Scorecard] Found ${activeCampaigns.length} active campaigns (with impressions > 0)`);
    
    // Process each active campaign
    activeCampaigns.forEach((campaign: Record<string, unknown>) => {
      console.log(`[Scorecard] Processing campaign: ${campaign.campaign_name || campaign.campaign_id} (${campaign.impressions} impressions)`);
      
      // Process each field for this campaign
      requiredFields.forEach(field => {
        const metricKey = Object.entries(META_FIELD_MAPPINGS).find(([, value]) => value === field)?.[0] || field;
        let value = 0;
        
        if (field.includes(':')) {
          // Handle action fields
          const [actionType, actionName] = field.split(':');
          const actionsData = campaign[actionType];
          if (Array.isArray(actionsData)) {
            const action = actionsData.find((a: { action_type: string; value: string }) => a.action_type === actionName);
            value = action ? parseFloat(action.value) : 0;
          }
        } else if (field === 'purchase_roas' && Array.isArray(campaign[field])) {
          // Handle ROAS array
          const roasArray = campaign[field] as Array<{ action_type: string; value: string }>;
          const purchaseRoas = roasArray.find((item) => 
            item.action_type === 'omni_purchase' || item.action_type === 'purchase'
          );
          value = purchaseRoas ? parseFloat(purchaseRoas.value) : 0;
        } else if (field !== 'actions' && field !== 'action_values') {
          // Direct fields
          const fieldValue = campaign[field];
          if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
            value = parseFloat(String(fieldValue)) || 0;
          }
        }
        
        // Aggregate the value
        if (!aggregatedData[metricKey]) {
          aggregatedData[metricKey] = 0;
        }
        aggregatedData[metricKey] += value;
      });
    });
    
    // For ROAS metrics, we need to calculate properly (total revenue / total spend)
    if (aggregatedData['purchase_value'] !== undefined && aggregatedData['spend'] !== undefined && aggregatedData['spend'] > 0) {
      // Recalculate ROAS as total revenue / total spend
      aggregatedData['purchase_roas'] = aggregatedData['purchase_value'] / aggregatedData['spend'];
    }
    
    console.log('[Scorecard] Aggregated campaign data:', aggregatedData);
    return aggregatedData;
  } catch (error) {
    console.error(`[Scorecard] Error fetching campaign-level data:`, error);
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
      .select('meta_access_token, meta_access_token_iv, meta_access_token_auth_tag, meta_ad_account_id, meta_default_ad_account_id')
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

    // Decrypt the access token
    let accessToken: string;
    try {
      accessToken = decryptToken({
        encryptedToken: brand.meta_access_token,
        iv: brand.meta_access_token_iv!,
        authTag: brand.meta_access_token_auth_tag!
      });
      
      // Validate token format
      if (!accessToken || accessToken.length < 10) {
        throw new Error('Invalid access token format');
      }
      
      console.log(`[Scorecard Refresh] Access token decrypted successfully, length: ${accessToken.length}`);
    } catch (error) {
      console.error('[Scorecard Refresh] Failed to decrypt access token:', error);
      return NextResponse.json({ 
        error: 'Failed to decrypt Meta access token. Please reconnect your Meta account in brand settings.' 
      }, { status: 500 });
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

    // Initialize counters
    let successCount = 0;
    let errorCount = 0;

    // Collect all required Meta fields
    const requiredFields = new Set<string>();
    
    metrics.forEach(metric => {
      let formula: MetricFormula[] = [];
      
      // Parse formula from database
      if (metric.calculation_formula) {
        try {
          // Check if it's already an object (JSONB returns as object)
          if (typeof metric.calculation_formula === 'object' && !Array.isArray(metric.calculation_formula)) {
            // If it's an object but not an array, something is wrong
            console.error(`[Scorecard Refresh] Invalid formula format for metric ${metric.metric_key}: expected array, got object`);
            errorCount++;
            return;
          } else if (Array.isArray(metric.calculation_formula)) {
            // It's already an array, use it directly
            formula = metric.calculation_formula;
          } else if (typeof metric.calculation_formula === 'string') {
            // It's a string, parse it
            formula = JSON.parse(metric.calculation_formula);
          } else {
            console.error(`[Scorecard Refresh] Unknown formula type for metric ${metric.metric_key}: ${typeof metric.calculation_formula}`);
            errorCount++;
            return;
          }
        } catch (e) {
          console.error(`[Scorecard Refresh] Failed to parse formula for metric ${metric.metric_key}:`, e);
          console.error(`[Scorecard Refresh] Raw formula value:`, metric.calculation_formula);
          console.error(`[Scorecard Refresh] Formula type:`, typeof metric.calculation_formula);
          errorCount++;
          return;
        }
      } else {
        // Handle NULL formulas
        console.warn(`[Scorecard Refresh] Metric ${metric.metric_key} has NULL formula, skipping`);
        errorCount++;
        return;
      }
      
      // Extract required fields from formula
      formula.forEach(item => {
        if (item.type === 'metric' && item.value) {
          const metaField = META_FIELD_MAPPINGS[item.value];
          if (metaField) {
            // Add the full field mapping, not just the base field
            requiredFields.add(metaField);
          }
        }
      });
    });

    // Always include these fields for ROAS calculations
    if (metrics.some(m => m.metric_key.includes('roas') || m.metric_key.includes('purchase'))) {
      requiredFields.add('actions');
      requiredFields.add('action_values');
      requiredFields.add('purchase_roas');
      // Also add the specific action fields we need
      requiredFields.add('actions:omni_purchase');
      requiredFields.add('action_values:omni_purchase');
    }

    console.log(`[Scorecard Refresh] Required Meta fields:`, Array.from(requiredFields));

    // Separate metrics into account-level and campaign-level
    const accountLevelMetrics = metrics.filter(m => 
      !m.metric_key.includes('creative_testing') && 
      !m.metric_key.includes('video_ads_roas') && 
      !m.metric_key.includes('image_ads_roas')
    );
    
    const campaignLevelMetrics = metrics.filter(m => 
      m.metric_key.includes('creative_testing') || 
      m.metric_key.includes('video_ads_roas') || 
      m.metric_key.includes('image_ads_roas')
    );

    console.log(`[Scorecard Refresh] Account-level metrics: ${accountLevelMetrics.length}`);
    console.log(`[Scorecard Refresh] Campaign-level metrics: ${campaignLevelMetrics.length}`);

    // Process each date range
    const results = [];

    for (const dateRange of dateRanges) {
      // Handle both Date objects and plain objects with start/end properties
      const startDate = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start);
      const endDate = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end);
      
      const dateRangeStr = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
      console.log(`[Scorecard Refresh] Processing date range: ${dateRangeStr}`);
      
      try {
        // Fetch account-level data
        const accountData = await fetchAccountLevelData(
          adAccountId,
          accessToken,
          {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          requiredFields
        );

        // Fetch campaign-level data for creative testing metrics
        let creativeTestingData: Record<string, number> = {};
        const creativeTestingMetrics = campaignLevelMetrics.filter(m => m.metric_key.includes('creative_testing'));
        
        if (creativeTestingMetrics.length > 0) {
          // Get creative testing filters from the first metric (they should all have the same filters)
          const filters = creativeTestingMetrics[0].meta_campaigns || [{ operator: 'contains', value: 'Creative Test' }];
          
          const campaignFields = new Set<string>();
          creativeTestingMetrics.forEach(metric => {
            let formula: MetricFormula[] = [];
            if (Array.isArray(metric.calculation_formula)) {
              formula = metric.calculation_formula;
            }
            
            formula.forEach(item => {
              if (item.type === 'metric' && item.value) {
                const metaField = META_FIELD_MAPPINGS[item.value];
                if (metaField) {
                  campaignFields.add(metaField);
                }
              }
            });
          });

          creativeTestingData = await fetchCampaignLevelData(
            adAccountId,
            accessToken,
            {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0]
            },
            campaignFields,
            filters
          );
        }

        // Merge data
        const metaData = { ...accountData, ...creativeTestingData };

        // Calculate and store values for each metric
        for (const metric of metrics) {
          try {
            let formula: MetricFormula[] = [];
            
            // Parse formula from database
            if (metric.calculation_formula) {
              try {
                // Check if it's already an object (JSONB returns as object)
                if (typeof metric.calculation_formula === 'object' && !Array.isArray(metric.calculation_formula)) {
                  // If it's an object but not an array, something is wrong
                  console.error(`[Scorecard Refresh] Invalid formula format for metric ${metric.metric_key}: expected array, got object`);
                  errorCount++;
                  continue;
                } else if (Array.isArray(metric.calculation_formula)) {
                  // It's already an array, use it directly
                  formula = metric.calculation_formula;
                } else if (typeof metric.calculation_formula === 'string') {
                  // It's a string, parse it
                  formula = JSON.parse(metric.calculation_formula);
                } else {
                  console.error(`[Scorecard Refresh] Unknown formula type for metric ${metric.metric_key}: ${typeof metric.calculation_formula}`);
                  errorCount++;
                  continue;
                }
              } catch (e) {
                console.error(`[Scorecard Refresh] Failed to parse formula for metric ${metric.metric_key}:`, e);
                console.error(`[Scorecard Refresh] Raw formula value:`, metric.calculation_formula);
                console.error(`[Scorecard Refresh] Formula type:`, typeof metric.calculation_formula);
                errorCount++;
                continue;
              }
            } else {
              // Handle NULL formulas
              console.warn(`[Scorecard Refresh] Metric ${metric.metric_key} has NULL formula, skipping`);
              errorCount++;
              continue;
            }

            // Use appropriate data source based on metric type
            const dataSource = metric.metric_key.includes('creative_testing') ? creativeTestingData : metaData;

            // Calculate value based on formula
            const value = calculateFormulaValue(
              formula, 
              dataSource,
              {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
              }
            );

            // Store in database
            const { error: upsertError } = await supabase
              .from('scorecard_data')
              .upsert({
                metric_id: metric.id,
                period_start: startDate.toISOString().split('T')[0],
                period_end: endDate.toISOString().split('T')[0],
                period_type: 'week',
                value: value,
                raw_data: dataSource
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