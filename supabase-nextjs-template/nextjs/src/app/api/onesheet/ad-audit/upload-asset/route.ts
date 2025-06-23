import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const onesheetId = formData.get('onesheetId') as string;
    const adId = formData.get('adId') as string;
    const brandId = formData.get('brandId') as string;

    if (!file || !onesheetId || !adId || !brandId) {
      return NextResponse.json({ 
        error: 'Missing required fields: file, onesheetId, adId, brandId' 
      }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Supported: JPEG, PNG, WebP, GIF, MP4, MOV, AVI, WebM' 
      }, { status: 400 });
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size: 50MB' 
      }, { status: 400 });
    }

    // Determine asset type
    const assetType = file.type.startsWith('video/') ? 'video' : 'image';
    const fileExtension = file.type.startsWith('video/') ? 'mp4' : 'jpg';
    
    // Create unique filename
    const timestamp = Date.now();
    const fileName = `onesheet-assets/${brandId}/manual_${adId}_${timestamp}.${fileExtension}`;

    // Convert file to array buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('onesheet-assets')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ 
        error: 'Failed to upload file to storage' 
      }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('onesheet-assets')
      .getPublicUrl(fileName);

    // Update the onesheet ad data with new asset URL
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('ad_account_audit')
      .eq('id', onesheetId)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const adAuditData = onesheet.ad_account_audit || { ads: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedAds = adAuditData.ads.map((ad: any) => {
      if (ad.id === adId) {
        return {
          ...ad,
          assetUrl: publicUrlData.publicUrl,
          assetType,
          assetLoadFailed: false, // Reset the failed flag
          manuallyUploaded: true // Mark as manually uploaded
        };
      }
      return ad;
    });

    // Update onesheet with new asset data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        ad_account_audit: {
          ...adAuditData,
          ads: updatedAds
        }
      })
      .eq('id', onesheetId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update OneSheet data' 
      }, { status: 500 });
    }

    // Save asset metadata to database
    try {
      await supabase
        .from('onesheet_ad_assets')
        .upsert({
          onesheet_id: onesheetId,
          ad_id: adId,
          asset_id: `manual_${adId}_${timestamp}`,
          asset_type: assetType,
          original_url: publicUrlData.publicUrl,
          local_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          manually_uploaded: true
        }, {
          onConflict: 'onesheet_id,ad_id,asset_id'
        });
    } catch (dbError) {
      console.warn('Failed to save asset metadata:', dbError);
      // Continue anyway - the asset is still uploaded
    }

    return NextResponse.json({
      success: true,
      data: {
        assetUrl: publicUrlData.publicUrl,
        assetType,
        fileName
      }
    });

  } catch (error) {
    console.error('Asset upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload asset' },
      { status: 500 }
    );
  }
} 