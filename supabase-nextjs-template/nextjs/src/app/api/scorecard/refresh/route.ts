import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId, teamId, dateRange, metrics } = body;

    if (!brandId || !dateRange || !metrics || metrics.length === 0) {
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

    // Process each metric
    const results = [];
    
    for (const metric of metrics) {
      try {
        // Extract base metric keys from formula
        const baseMetricKeys: string[] = [];
        if (metric.formula && metric.formula.length > 0) {
          metric.formula.forEach((item: any) => {
            if (item.type === 'metric' && item.value) {
              if (!baseMetricKeys.includes(item.value)) {
                baseMetricKeys.push(item.value);
              }
            }
          });
        }

        if (baseMetricKeys.length === 0) {
          results.push({
            metric_id: metric.id,
            success: false,
            error: 'No base metrics found in formula'
          });
          continue;
        }

        // Call the Meta insights endpoint
        const metaResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scorecard/meta-insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            brandId,
            metricConfigPayload: {
              formula: metric.formula,
              campaignNameFilters: metric.campaign_name_filters || [],
              adSetNameFilters: metric.ad_set_name_filters || [],
              adNameFilters: metric.ad_name_filters || []
            },
            baseMetaMetricKeys: baseMetricKeys,
            dateRange
          })
        });

        if (!metaResponse.ok) {
          const error = await metaResponse.json();
          results.push({
            metric_id: metric.id,
            success: false,
            error: error.error || 'Failed to fetch Meta data'
          });
          continue;
        }

        const metaData = await metaResponse.json();
        
        // Calculate the metric value based on formula
        let calculatedValue = 0;
        if (metaData.data && metric.formula) {
          calculatedValue = calculateFormulaValue(metric.formula, metaData.data);
        }

        // Store the calculated value
        const { error: insertError } = await supabase
          .from('scorecard_data')
          .upsert({
            metric_id: metric.id,
            period_start: dateRange.start,
            period_end: dateRange.end,
            value: calculatedValue
          }, {
            onConflict: 'metric_id,period_start,period_end'
          });

        if (insertError) {
          results.push({
            metric_id: metric.id,
            success: false,
            error: insertError.message
          });
        } else {
          results.push({
            metric_id: metric.id,
            success: true,
            value: calculatedValue
          });
        }
      } catch (error) {
        results.push({
          metric_id: metric.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results 
    });

  } catch (error) {
    console.error('Error in POST /api/scorecard/refresh:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateFormulaValue(formula: any[], data: Record<string, number>): number {
  // Simple formula evaluation - supports basic arithmetic
  // Formula items: { type: 'metric' | 'number' | 'operator', value: string }
  
  const tokens: (number | string)[] = [];
  
  for (const item of formula) {
    if (item.type === 'metric') {
      tokens.push(data[item.value] || 0);
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
  
  return result;
}