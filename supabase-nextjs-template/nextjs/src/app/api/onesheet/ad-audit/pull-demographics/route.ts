import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptToken } from '@/lib/utils/tokenEncryption';

const API_VERSION = 'v22.0';

// Function to fetch account demographics
async function fetchAccountDemographics(
  adAccountId: string,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<{ age: Record<string, number>; gender: Record<string, number>; placement: Record<string, number> }> {
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
    const ageGenderUrl = `https://graph.facebook.com/${API_VERSION}/${adAccountId}/insights?` +
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
    
    // Fetch placement breakdown
    const placementUrl = `https://graph.facebook.com/${API_VERSION}/${adAccountId}/insights?` +
      `fields=impressions` +
      `&breakdowns=publisher_platform` +
      `&${timeParam}` +
      `&access_token=${accessToken}`;
    
    console.log('Fetching placement demographics...');
    const placementResponse = await fetch(placementUrl);
    
    const placementBreakdown: Record<string, number> = {};
    
    if (placementResponse.ok) {
      const placementData = await placementResponse.json();
      let totalPlacementImpressions = 0;
      
      if (placementData.data && placementData.data.length > 0) {
        // Calculate total
        placementData.data.forEach((row: { publisher_platform?: string; impressions?: string }) => {
          const impressions = parseInt(row.impressions || '0');
          totalPlacementImpressions += impressions;
        });
        
        // Calculate percentages
        placementData.data.forEach((row: { publisher_platform?: string; impressions?: string }) => {
          const platform = row.publisher_platform || 'unknown';
          const impressions = parseInt(row.impressions || '0');
          placementBreakdown[platform] = totalPlacementImpressions > 0 
            ? (impressions / totalPlacementImpressions) * 100 
            : 0;
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
      placement: placementBreakdown
    };
  } catch (error) {
    console.error('Error fetching demographics:', error);
    // Return empty data instead of throwing
    return {
      age: {},
      gender: {},
      placement: {}
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

    // Get the onesheet to check permissions and get ad account info
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('*, brands!inner(id, name, meta_ad_account_id, meta_encrypted_access_token)')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const brand = onesheet.brands;
    const adAccountId = brand.meta_ad_account_id;
    const encryptedToken = brand.meta_encrypted_access_token;

    if (!adAccountId || !encryptedToken) {
      return NextResponse.json({ 
        error: 'Meta Ad Account not configured for this brand' 
      }, { status: 400 });
    }

    // Decrypt the access token
    const accessToken = decryptToken(encryptedToken);

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