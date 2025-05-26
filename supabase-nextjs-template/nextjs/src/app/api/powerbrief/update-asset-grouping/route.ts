import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conceptId, assetGroups } = await req.json();

    if (!conceptId || !assetGroups) {
      return NextResponse.json({ message: 'Missing concept ID or asset groups.' }, { status: 400 });
    }

    console.log('=== UPDATING ASSET GROUPING ===');
    console.log('Concept ID:', conceptId);
    console.log('Number of asset groups:', assetGroups.length);
    console.log('Asset groups structure:', JSON.stringify(assetGroups, null, 2));

    // First, let's see what's currently in the database
    const { data: currentData, error: fetchError } = await supabaseAdmin
      .from('brief_concepts')
      .select('id, uploaded_assets')
      .eq('id', conceptId)
      .single();

    if (fetchError) {
      console.error('Error fetching current data:', fetchError);
      return NextResponse.json({ 
        message: 'Failed to fetch current concept data.',
        error: fetchError.message 
      }, { status: 500 });
    }

    console.log('Current data in database:', JSON.stringify(currentData, null, 2));

    // Update the concept with the new asset grouping
    const { data, error } = await supabaseAdmin
      .from('brief_concepts')
      .update({ 
        uploaded_assets: assetGroups,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId)
      .select('id, uploaded_assets')
      .single();

    if (error) {
      console.error('Error updating asset grouping:', error);
      return NextResponse.json({ 
        message: 'Failed to update asset grouping.',
        error: error.message 
      }, { status: 500 });
    }

    console.log('=== UPDATE SUCCESSFUL ===');
    console.log('Updated data:', JSON.stringify(data, null, 2));
    console.log('Number of groups after update:', data.uploaded_assets?.length || 0);

    // Verify the update by fetching again
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('brief_concepts')
      .select('id, uploaded_assets')
      .eq('id', conceptId)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else {
      console.log('=== VERIFICATION ===');
      console.log('Verified data:', JSON.stringify(verifyData, null, 2));
      console.log('Verified number of groups:', verifyData.uploaded_assets?.length || 0);
    }

    return NextResponse.json({ 
      message: 'Asset grouping updated successfully',
      updatedConcept: data,
      verificationData: verifyData
    }, { status: 200 });

  } catch (error) {
    console.error('Error in update-asset-grouping API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 