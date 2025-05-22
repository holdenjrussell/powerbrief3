import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not configured correctly.' },
        { status: 500 }
      );
    }

    // Get conceptId from URL search params
    const searchParams = request.nextUrl.searchParams;
    const conceptId = searchParams.get('conceptId');

    if (!conceptId) {
      return NextResponse.json(
        { error: 'Concept ID is required' },
        { status: 400 }
      );
    }

    // List files in the voiceovers directory for this concept
    const { data, error } = await supabase.storage
      .from('audio')
      .list(`voiceovers/${conceptId}`, {
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return NextResponse.json(
        { error: 'Failed to list audio files' },
        { status: 500 }
      );
    }

    // Get public URLs for all files
    const fileUrls = data.map(file => {
      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(`voiceovers/${conceptId}/${file.name}`);
      
      return {
        name: file.name,
        url: urlData.publicUrl,
        created_at: file.created_at,
        size: file.metadata.size
      };
    });

    return NextResponse.json({
      success: true,
      files: fileUrls
    });
  } catch (error) {
    console.error('Error handling file retrieval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 