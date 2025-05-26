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

    console.log('Updating asset grouping for concept:', conceptId);
    console.log('New asset groups:', JSON.stringify(assetGroups, null, 2));

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

    console.log('Successfully updated asset grouping:', data);

    return NextResponse.json({ 
      message: 'Asset grouping updated successfully',
      updatedConcept: data
    }, { status: 200 });

  } catch (error) {
    console.error('Error in update-asset-grouping API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 