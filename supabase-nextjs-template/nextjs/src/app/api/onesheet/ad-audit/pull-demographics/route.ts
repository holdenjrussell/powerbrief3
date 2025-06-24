import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

const API_VERSION = 'v22.0';

// Function to fetch account demographics
async function fetchAccountDemographics(
  adAccountId: string,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<{ age: Record<string, number>; gender: Record<string, number>; placement: Record<string, number>; placementSpend: Record<string, number>; placementRoas: Record<string, number>; placementRevenue: Record<string, number> }> {
  try {
    console.log(`Fetching demographics for account ${adAccountId}`);
    
    // Set date range parameters
    const endDate = dateRange?.end || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Use date_preset for better performance when possible
    let timeParam: string;
    const daysDiff = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 7) {
      timeParam = 'date_preset=last_7d';
    } else if (daysDiff === 14) {
      timeParam = 'date_preset=last_14d';
    } else if (daysDiff === 30) {
      timeParam = 'date_preset=last_30d';
    } else if (daysDiff === 90) {
      timeParam = 'date_preset=last_90d';
    } else {
      timeParam = `time_range={'since':'${startDate}','until':'${endDate}'}`;
    }
    
    // Construct the API URL for age and gender breakdown
    // Ensure we have the act_ prefix for the ad account ID
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    
    const ageGenderUrl = `https://graph.facebook.com/${API_VERSION}/${formattedAccountId}/insights?` +
      `fields=impressions` +
      `&breakdowns=age,gender` +
      `&${timeParam}` +
      `&access_token=${accessToken}`;
    
    console.log('Fetching age and gender demographics...');
    const ageGenderResponse = await fetch(ageGenderUrl);
    
    if (!ageGenderResponse.ok) {
      const errorText = await ageGenderResponse.text();
      console.error('Age/Gender API Error:', errorText);
      throw new Error(`Failed to fetch age/gender demographics: ${ageGenderResponse.status} ${errorText}`);
    }
    
    const ageGenderData = await ageGenderResponse.json();
    
    // Process age and gender data
    const ageBreakdown: Record<string, number> = {};
    const genderBreakdown: Record<string, number> = {};
    let totalImpressions = 0;
    
    if (ageGenderData.data && ageGenderData.data.length > 0) {
      // First, calculate total impressions
      ageGenderData.data.forEach((row: { age?: string; gender?: string; impressions?: string }) => {
        const impressions = parseInt(row.impressions || '0');
        totalImpressions += impressions;
      });
      
      // Then calculate percentages
      ageGenderData.data.forEach((row: { age?: string; gender?: string; impressions?: string }) => {
        const age = row.age || 'unknown';
        const gender = row.gender || 'unknown';
        const impressions = parseInt(row.impressions || '0');
        
        if (!ageBreakdown[age]) ageBreakdown[age] = 0;
        if (!genderBreakdown[gender]) genderBreakdown[gender] = 0;
        
        // Add impressions
        ageBreakdown[age] += impressions;
        genderBreakdown[gender] += impressions;
      });
      
      // Convert to percentages
      Object.keys(ageBreakdown).forEach(key => {
        ageBreakdown[key] = totalImpressions > 0 ? (ageBreakdown[key] / totalImpressions) * 100 : 0;
      });
      
      Object.keys(genderBreakdown).forEach(key => {
        genderBreakdown[key] = totalImpressions > 0 ? (genderBreakdown[key] / totalImpressions) * 100 : 0;
      });
    }
    
    // Fetch detailed placement breakdown with more specific placements and performance metrics
    const detailedPlacementUrl = `https://graph.facebook.com/${API_VERSION}/${formattedAccountId}/insights?` +
      `fields=impressions,spend,purchase_roas,actions,action_values` +
      `&breakdowns=publisher_platform,platform_position` +
      `&${timeParam}` +
      `&access_token=${accessToken}`;
    
    console.log('Fetching detailed placement demographics...');
    const placementResponse = await fetch(detailedPlacementUrl);
    
    const placementBreakdown: Record<string, number> = {};
    const placementSpend: Record<string, number> = {};
    const placementRoas: Record<string, number> = {};
    const placementRevenue: Record<string, number> = {};
    
    if (placementResponse.ok) {
      const placementData = await placementResponse.json();
      let totalPlacementImpressions = 0;
      
      // First pass: calculate totals
      if (placementData.data && placementData.data.length > 0) {
        placementData.data.forEach((row: { 
          publisher_platform?: string; 
          platform_position?: string;
          impressions?: string; 
          spend?: string;
          purchase_roas?: Array<{action_type: string, value: string}>;
          actions?: Array<{action_type: string, value: string}>;
          action_values?: Array<{action_type: string, value: string}>;
        }) => {
          const impressions = parseInt(row.impressions || '0');
          totalPlacementImpressions += impressions;
        });
        
        // Second pass: aggregate by placement name and calculate metrics
        const placementAggregates: Record<string, {
          impressions: number;
          spend: number;
          revenue: number;
          count: number;
        }> = {};
        
        placementData.data.forEach((row: { 
          publisher_platform?: string; 
          platform_position?: string;
          impressions?: string; 
          spend?: string;
          action_values?: Array<{action_type: string, value: string}>;
        }) => {
          const platform = row.publisher_platform || 'unknown';
          const position = row.platform_position || '';
          
          // Create more descriptive placement names
          let placementName = platform;
          if (platform === 'facebook' && position) {
            if (position === 'feed') placementName = 'Facebook Feed';
            else if (position === 'right_hand_column') placementName = 'Facebook Right Column';
            else if (position === 'story') placementName = 'Facebook Stories';
            else if (position === 'video_feeds') placementName = 'Facebook Video Feeds';
            else if (position === 'marketplace') placementName = 'Facebook Marketplace';
            else placementName = `Facebook ${position}`;
          } else if (platform === 'instagram' && position) {
            if (position === 'feed') placementName = 'Instagram Feed';
            else if (position === 'story') placementName = 'Instagram Stories';
            else if (position === 'reels') placementName = 'Instagram Reels';
            else if (position === 'explore') placementName = 'Instagram Explore';
            else if (position === 'shop') placementName = 'Instagram Shop';
            else placementName = `Instagram ${position}`;
          } else if (platform === 'audience_network') {
            placementName = 'Audience Network';
          } else if (platform === 'messenger') {
            if (position === 'messenger_home') placementName = 'Messenger Home';
            else if (position === 'sponsored_messages') placementName = 'Messenger Sponsored Messages';
            else placementName = 'Messenger';
          }
          
          const impressions = parseInt(row.impressions || '0');
          const spend = parseFloat(row.spend || '0');
          
          // Get revenue from purchase actions
          let revenue = 0;
                     if (row.action_values) {
             const purchaseAction = row.action_values.find((action: {action_type: string, value: string}) => 
               action.action_type === 'omni_purchase' || action.action_type === 'purchase'
             );
            if (purchaseAction) {
              revenue = parseFloat(purchaseAction.value || '0');
            }
          }
          
          if (!placementAggregates[placementName]) {
            placementAggregates[placementName] = {
              impressions: 0,
              spend: 0,
              revenue: 0,
              count: 0
            };
          }
          
          placementAggregates[placementName].impressions += impressions;
          placementAggregates[placementName].spend += spend;
          placementAggregates[placementName].revenue += revenue;
          placementAggregates[placementName].count += 1;
        });
        
        // Calculate final metrics
        Object.entries(placementAggregates).forEach(([placementName, data]) => {
          // Impression percentage
          placementBreakdown[placementName] = totalPlacementImpressions > 0 
            ? (data.impressions / totalPlacementImpressions) * 100 
            : 0;
          
          // Spend
          placementSpend[placementName] = data.spend;
          
          // Revenue
          placementRevenue[placementName] = data.revenue;
          
          // ROAS
          placementRoas[placementName] = data.spend > 0 ? data.revenue / data.spend : 0;
        });
      }
    }
    
    console.log('Demographics fetched successfully:', {
      age: Object.keys(ageBreakdown).length,
      gender: Object.keys(genderBreakdown).length,
      placement: Object.keys(placementBreakdown).length
    });
    
    return {
      age: ageBreakdown,
      gender: genderBreakdown,
      placement: placementBreakdown,
      placementSpend: placementSpend,
      placementRoas: placementRoas,
      placementRevenue: placementRevenue
    };
  } catch (error) {
    console.error('Error fetching demographics:', error);
    // Return empty data instead of throwing
    return {
      age: {},
      gender: {},
      placement: {},
      placementSpend: {},
      placementRoas: {},
      placementRevenue: {}
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { onesheet_id, date_range } = await request.json();

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the onesheet to check permissions
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('*, brand_id')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      console.error('OneSheet error:', onesheetError);
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Get the brand data separately
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, meta_ad_account_id, meta_default_ad_account_id, meta_access_token, meta_access_token_iv, meta_access_token_auth_tag')
      .eq('id', onesheet.brand_id)
      .single();

    if (brandError || !brand) {
      console.error('Brand error:', brandError);
      return NextResponse.json({ error: 'Brand not found for this OneSheet' }, { status: 404 });
    }
    // Determine which ad account to use (same logic as import endpoint)
    let adAccountId = brand.meta_default_ad_account_id || brand.meta_ad_account_id;
    
    if (!adAccountId || !brand.meta_access_token) {
      return NextResponse.json({ 
        error: 'Meta Ad Account not configured for this brand' 
      }, { status: 400 });
    }

    // Remove 'act_' prefix if it exists (we'll add it back in the URL)
    if (adAccountId.startsWith('act_')) {
      adAccountId = adAccountId.substring(4);
    }

    // Decrypt the access token (same as import endpoint)
    const accessToken = decryptToken({
      encryptedToken: brand.meta_access_token,
      iv: brand.meta_access_token_iv,
      authTag: brand.meta_access_token_auth_tag
    });

    // Parse date range
    let dateRangeObj;
    if (date_range === 'last_7d') {
      dateRangeObj = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };
    } else if (date_range === 'last_14d') {
      dateRangeObj = {
        start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };
    } else if (date_range === 'last_30d') {
      dateRangeObj = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };
    } else if (date_range === 'last_90d') {
      dateRangeObj = {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };
    } else {
      dateRangeObj = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };
    }

    // Fetch demographics
    const demographics = await fetchAccountDemographics(adAccountId, accessToken, dateRangeObj);

    // Get existing ad account audit data
    const existingAudit = (onesheet.ad_account_audit as Record<string, unknown>) || {};

    // Update only the demographic breakdown
    const updatedAudit = {
      ...existingAudit,
      demographicBreakdown: demographics,
      demographicsLastUpdated: new Date().toISOString()
    };

    // Save to database
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ 
        ad_account_audit: updatedAudit
      })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Error updating onesheet:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save demographics data' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      demographics
    });

  } catch (error) {
    console.error('Error in pull demographics endpoint:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to pull demographics' 
    }, { status: 500 });
  }
} 