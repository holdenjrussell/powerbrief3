import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process the multipart form data to get the file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Generate a unique filename to avoid collisions
    const fileExtension = file.name.split('.').pop();
    const fileName = `temp/${uuidv4()}.${fileExtension}`;

    // Convert file to arrayBuffer for upload
    const fileArrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('powerbrief-media')
      .upload(fileName, fileArrayBuffer, {
        contentType: file.type,
        // Set an expiration time for temporary files (e.g., 1 hour)
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('powerbrief-media')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('Error in file upload:', error);
    return NextResponse.json({ 
      error: 'File upload failed' 
    }, { status: 500 });
  }
} 