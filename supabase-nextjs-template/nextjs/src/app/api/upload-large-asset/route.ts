import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // For public share pages, we don't require authentication
    // Check if user is authenticated (optional for public uploads)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Process the multipart form data to get the file and metadata
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filePath = formData.get('filePath') as string;
    const conceptId = formData.get('conceptId') as string;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!filePath || !conceptId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // If user is authenticated, verify they own this upload
    // For public uploads, userId might be a temporary/guest ID
    if (session && userId && session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized - user mismatch' }, { status: 403 });
    }

    console.log(`[Large Asset Upload] Starting upload for ${file.name} (${file.size} bytes) - ${session ? 'Authenticated' : 'Public'} upload`);

    // Convert file to arrayBuffer for upload
    const fileArrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage with enhanced configuration for large files
    const { error } = await supabase.storage
      .from('ad-creatives')
      .upload(filePath, fileArrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[Large Asset Upload] Supabase storage upload error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please contact support.' 
        }, { status: 500 });
      }
      
      if (error.message?.includes('size') || error.message?.includes('exceeded')) {
        return NextResponse.json({ 
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please compress the file or contact support.` 
        }, { status: 413 });
      }
      
      return NextResponse.json({ 
        error: `Upload failed: ${error.message}` 
      }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('ad-creatives')
      .getPublicUrl(filePath);

    console.log(`[Large Asset Upload] Upload successful for ${file.name}`);

    return NextResponse.json({ 
      success: true, 
      publicUrl: publicUrl,
      filePath: filePath,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error) {
    console.error('[Large Asset Upload] Error in large asset upload:', error);
    return NextResponse.json({ 
      error: 'Large asset upload failed' 
    }, { status: 500 });
  }
}

// Configure the API route to handle large files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1gb', // Allow up to 1GB uploads
    },
  },
}; 