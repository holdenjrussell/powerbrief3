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

    if (!conceptId || !assetGroups || !Array.isArray(assetGroups)) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Add timestamps to asset groups
    const timestampedAssetGroups: UploadedAssetGroup[] = assetGroups.map((group: UploadedAssetGroup) => ({
      ...group,
      uploadedAt: new Date().toISOString(),
      assets: group.assets.map((asset) => ({
        ...asset,
        uploadedAt: new Date().toISOString()
      }))
    }));

    // Update the concept with the uploaded assets
    const { error: updateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        uploaded_assets: timestampedAssetGroups,
        asset_upload_status: 'uploaded',
        review_status: 'ready_for_review',
        status: 'READY FOR REVIEW',
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (updateError) {
      console.error('Error updating concept with assets:', updateError);
      return NextResponse.json({ message: 'Failed to save assets.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Assets uploaded successfully',
      assetGroups: timestampedAssetGroups
    }, { status: 200 });

  } catch (error) {
    console.error('Error in upload-assets API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 