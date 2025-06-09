import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const assetName = formData.get('assetName') as string;
    const draftId = formData.get('draftId') as string;

    if (!file || !assetName || !draftId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, assetName, or draftId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    // Upload thumbnail to Supabase Storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const thumbnailFileName = `${assetName.split('.')[0]}_custom_thumbnail_${timestamp}.${fileExtension}`;
    const thumbnailPath = `${draftId}/${thumbnailFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ad-creatives')
      .upload(thumbnailPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error('Failed to upload thumbnail to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload thumbnail to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ad-creatives')
      .getPublicUrl(thumbnailPath);

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded thumbnail' },
        { status: 500 }
      );
    }

    // Update the asset in the database with the thumbnail URL
    const { error: updateError } = await supabase
      .from('ad_draft_assets')
      .update({ 
        thumbnail_url: publicUrl,
        thumbnail_timestamp: 0 // Use 0 to indicate custom thumbnail
      })
      .eq('ad_draft_id', draftId)
      .eq('name', assetName);

    if (updateError) {
      console.error('Failed to update asset with thumbnail URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update asset with thumbnail URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl: publicUrl,
      message: 'Custom thumbnail uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading custom thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}