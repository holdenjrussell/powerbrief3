import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SocialMediaContentRow {
  id: string;
  brand_id: string;
  user_id: string;
  source_url: string;
  platform: string;
  title: string | null;
  description: string | null;
  content_type: 'image' | 'video';
  file_url: string;
  file_name: string;
  file_size: number | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  sent_to_ad_batch: boolean;
  sent_to_ad_batch_at: string | null;
  sent_to_ad_batch_by: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { assetIds, userId, brandId, adBatchId } = await req.json();

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ message: 'Missing or invalid asset IDs.' }, { status: 400 });
    }

    if (!userId || !brandId) {
      return NextResponse.json({ message: 'Missing user ID or brand ID.' }, { status: 400 });
    }

    // Fetch the selected assets from social_media_content
    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('social_media_content')
      .select('*')
      .in('id', assetIds)
      .eq('user_id', userId)
      .eq('brand_id', brandId);

    if (assetsError || !assets || assets.length === 0) {
      console.error('Error fetching assets:', assetsError);
      return NextResponse.json({ message: 'Assets not found or access denied.' }, { status: 404 });
    }

    // Cast to our interface for type safety
    const typedAssets = assets as SocialMediaContentRow[];

    // If a brief batch ID is provided, verify it exists and belongs to the user
    let briefBatchId = adBatchId;
    let nextOrderInBatch = 1;
    let startingConceptNumber = 1;
    
    if (briefBatchId) {
      const { data: batch, error: batchError } = await supabaseAdmin
        .from('brief_batches')
        .select('id, name, brand_id, user_id, starting_concept_number')
        .eq('id', briefBatchId)
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .single();

      if (batchError || !batch) {
        console.error('Error verifying brief batch:', batchError);
        return NextResponse.json({ message: 'Brief batch not found or access denied.' }, { status: 404 });
      }

      startingConceptNumber = batch.starting_concept_number || 1;

      // Get the next order number for this batch
      const { data: existingConcepts, error: conceptsError } = await supabaseAdmin
        .from('brief_concepts')
        .select('order_in_batch')
        .eq('brief_batch_id', briefBatchId)
        .order('order_in_batch', { ascending: false })
        .limit(1);

      if (!conceptsError && existingConcepts && existingConcepts.length > 0) {
        nextOrderInBatch = (existingConcepts[0].order_in_batch || 0) + 1;
      }
    } else {
      // If no batch specified, create a default "AdRipper Assets" batch
      const { data: newBatch, error: createBatchError } = await supabaseAdmin
        .from('brief_batches')
        .insert({
          name: 'AdRipper Assets',
          brand_id: brandId,
          user_id: userId,
          starting_concept_number: 1, // Set default starting number
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, starting_concept_number')
        .single();

      if (createBatchError || !newBatch) {
        console.error('Error creating default batch:', createBatchError);
        return NextResponse.json({ message: 'Failed to create batch for assets.' }, { status: 500 });
      }

      briefBatchId = newBatch.id;
      startingConceptNumber = newBatch.starting_concept_number || 1;
    }

    // Create concepts for the assets
    const createdConcepts = [];

    for (const asset of typedAssets) {
      try {
        // Copy the asset file from social-media-content bucket to ad-creatives bucket
        // Extract the file path from the AdRipper URL
        const adrippperFileUrl = new URL(asset.file_url);
        let adrippperFilePath = adrippperFileUrl.pathname;
        
        // Handle different URL formats for the file path extraction
        if (adrippperFilePath.includes('/storage/v1/object/public/social-media-content/')) {
          adrippperFilePath = adrippperFilePath.replace('/storage/v1/object/public/social-media-content/', '');
        } else if (adrippperFilePath.startsWith('/storage/v1/object/public/')) {
          // Handle case where the full path is in the URL
          adrippperFilePath = adrippperFilePath.replace('/storage/v1/object/public/', '').replace('social-media-content/', '');
        } else {
          // Fallback: just remove leading slash and assume it's the direct path
          adrippperFilePath = adrippperFilePath.startsWith('/') ? adrippperFilePath.substring(1) : adrippperFilePath;
        }
        
        // Create new file path for PowerBrief
        const cleanFileName = asset.file_name.replace(/[^a-zA-Z0-9._-]/g, '');
        const newFilePath = `powerbrief/${userId}/${Date.now()}_adripper_${cleanFileName}`;
        
        console.log('Copying asset:', {
          originalUrl: asset.file_url,
          extractedPath: adrippperFilePath,
          newPath: newFilePath,
          fileName: asset.file_name
        });

        // Try to download the file from AdRipper storage
        let fileData;

        // First, try with the extracted path
        const downloadResult = await supabaseAdmin.storage
          .from('social-media-content')
          .download(adrippperFilePath);

        if (downloadResult.error) {
          console.error('First download attempt failed:', downloadResult.error);
          
          // If that fails, try downloading directly from the URL
          try {
            console.log('Attempting direct download from URL:', asset.file_url);
            const response = await fetch(asset.file_url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            fileData = await response.blob();
            console.log('Direct download successful, file size:', fileData.size);
          } catch (fetchError) {
            console.error('Direct download also failed:', fetchError);
            throw new Error(`Failed to download asset: ${asset.file_name} - Storage path: ${downloadResult.error?.message}, Direct URL: ${fetchError}`);
          }
        } else {
          fileData = downloadResult.data;
          console.log('Storage download successful, file size:', fileData?.size);
        }

        // Upload to PowerBrief storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('ad-creatives')
          .upload(newFilePath, fileData, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError || !uploadData) {
          console.error('Error uploading to PowerBrief storage:', uploadError);
          throw new Error(`Failed to upload asset: ${asset.file_name} - ${uploadError?.message || 'Unknown error'}`);
        }

        // Get the public URL for the new location
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('ad-creatives')
          .getPublicUrl(newFilePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error(`Failed to get public URL for: ${asset.file_name}`);
        }

        const powerbriefFileUrl = publicUrlData.publicUrl;

        // Calculate the concept number using the same logic as bulk import
        // conceptNumber = startingConceptNumber + existing concepts count + current position in this batch
        const conceptNumber = startingConceptNumber + nextOrderInBatch - 1;
        const conceptTitle = `Concept ${conceptNumber}`;

        // Create brief concept with proper order using the same approach as bulk import
        const conceptData = {
          brief_batch_id: briefBatchId,
          user_id: userId,
          concept_title: conceptTitle,
          media_url: powerbriefFileUrl, // Use media_url like bulk import
          media_type: asset.content_type, // Use media_type like bulk import
          body_content_structured: [], // Empty scenes initially
          order_in_batch: nextOrderInBatch,
          status: 'draft',
          description: asset.notes || `Asset ripped from ${asset.platform}: ${asset.source_url}`,
          // Remove uploaded_assets and asset_upload_status as we're using the simpler approach
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdConcept, error: conceptError } = await supabaseAdmin
          .from('brief_concepts')
          .insert(conceptData)
          .select('id, concept_title, order_in_batch')
          .single();

        if (conceptError) {
          console.error('Error creating concept:', conceptError);
          throw new Error(`Failed to create concept for: ${asset.file_name}`);
        }

        createdConcepts.push({
          id: createdConcept.id,
          title: createdConcept.concept_title,
          conceptNumber: conceptNumber,
          assetName: asset.file_name,
          platform: asset.platform,
          powerbriefUrl: powerbriefFileUrl
        });

        // Increment order for next concept
        nextOrderInBatch++;

      } catch (error) {
        console.error(`Error processing asset ${asset.file_name}:`, error);
        // Continue with other assets but log the error
        continue;
      }
    }

    // Mark the assets as sent to PowerBrief
    const { error: updateError } = await supabaseAdmin
      .from('social_media_content')
      .update({
        sent_to_ad_batch: true,
        sent_to_ad_batch_at: new Date().toISOString(),
        sent_to_ad_batch_by: userId
      })
      .in('id', assetIds);

    if (updateError) {
      console.error('Error updating assets as sent to PowerBrief:', updateError);
      // Don't fail the whole operation, just log the error
    }

    return NextResponse.json({ 
      message: 'Assets sent to PowerBrief successfully',
      createdConcepts: createdConcepts,
      totalConcepts: createdConcepts.length,
      briefBatchId: briefBatchId
    }, { status: 200 });

  } catch (error) {
    console.error('Error in send assets to PowerBrief API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 