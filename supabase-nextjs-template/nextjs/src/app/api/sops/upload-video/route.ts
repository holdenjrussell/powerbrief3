import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process the multipart form data to get the file and metadata
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sopId = formData.get('sopId') as string;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!sopId) {
      return NextResponse.json({ error: 'SOP ID is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Check file size (max 500MB for SOP videos)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.` 
      }, { status: 413 });
    }

    console.log(`[SOP Video Upload] Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Generate a unique filename to avoid collisions
    const fileExtension = file.name.split('.').pop() || 'mp4';
    const fileName = `sops/${sopId}/${uuidv4()}.${fileExtension}`;

    // Convert file to arrayBuffer for upload
    const fileArrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('powerbrief-media')
      .upload(fileName, fileArrayBuffer, {
        contentType: file.type,
        cacheControl: '86400', // Cache for 24 hours
        upsert: false,
      });

    if (storageError) {
      console.error('[SOP Video Upload] Supabase storage upload error:', storageError);
      
      // Provide specific error messages
      if (storageError.message?.includes('bucket') || storageError.message?.includes('not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please contact support.' 
        }, { status: 500 });
      }
      
      if (storageError.message?.includes('size') || storageError.message?.includes('exceeded')) {
        return NextResponse.json({ 
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a smaller file.` 
        }, { status: 413 });
      }
      
      return NextResponse.json({ 
        error: `Upload failed: ${storageError.message}` 
      }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('powerbrief-media')
      .getPublicUrl(fileName);

    // Save video metadata to database
    const { data: videoRecord, error: dbError } = await supabase
      .from('sop_videos')
      .insert({
        sop_id: sopId,
        title: title || file.name,
        description: description,
        video_url: publicUrl,
        file_name: fileName,
        original_name: file.name,
        file_size: file.size,
        uploaded_by: session.user.id,
        is_active: true // New uploads are automatically active
      })
      .select()
      .single();

    if (dbError) {
      console.error('[SOP Video Upload] Database error:', dbError);
      
      // Try to clean up the uploaded file if database save fails
      try {
        await supabase.storage
          .from('powerbrief-media')
          .remove([fileName]);
      } catch (cleanupError) {
        console.error('[SOP Video Upload] Cleanup error:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: `Failed to save video metadata: ${dbError.message}` 
      }, { status: 500 });
    }

    console.log(`[SOP Video Upload] Upload successful for ${file.name}`);

    return NextResponse.json({ 
      success: true, 
      videoUrl: publicUrl,
      fileName: fileName,
      originalName: file.name,
      fileSize: file.size,
      videoId: videoRecord.id
    });

  } catch (error) {
    console.error('[SOP Video Upload] Error in SOP video upload:', error);
    return NextResponse.json({ 
      error: 'SOP video upload failed' 
    }, { status: 500 });
  }
}

// Allow large file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
}; 