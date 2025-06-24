import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { onesheet_id } = await request.json();

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = await createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the onesheet to check permissions
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('ad_account_audit')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    // Get existing ad account audit data
    const existingAudit = (onesheet.ad_account_audit as any) || {};

    // Remove only the demographic breakdown
    const { demographicBreakdown, demographicsLastUpdated, ...restOfAudit } = existingAudit;

    // Save to database
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ 
        ad_account_audit: restOfAudit
      })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Error updating onesheet:', updateError);
      return NextResponse.json({ 
        error: 'Failed to clear demographics data' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Demographics data cleared successfully'
    });

  } catch (error) {
    console.error('Error in clear demographics endpoint:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to clear demographics' 
    }, { status: 500 });
  }
} 