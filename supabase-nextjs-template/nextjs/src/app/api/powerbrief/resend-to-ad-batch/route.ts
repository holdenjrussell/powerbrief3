import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conceptId } = await req.json();

    if (!conceptId) {
      return NextResponse.json({ message: 'Missing concept ID.' }, { status: 400 });
    }

    // First, reset the asset upload status to allow resending
    const { error: resetError } = await supabaseAdmin
      .from('brief_concepts')
      .update({ 
        asset_upload_status: 'uploaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (resetError) {
      console.error('Error resetting concept status:', resetError);
      return NextResponse.json({ message: 'Failed to reset concept status.' }, { status: 500 });
    }

    // Then call the existing send-to-ad-batch API
    const sendResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/powerbrief/send-to-ad-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conceptId }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      return NextResponse.json({ 
        message: errorData.message || 'Failed to resend to ad uploader.' 
      }, { status: sendResponse.status });
    }

    const result = await sendResponse.json();
    
    return NextResponse.json({ 
      message: 'Assets have been resent to the Ad Upload Tool with improved grouping.',
      ...result
    }, { status: 200 });

  } catch (error) {
    console.error('Error in resend-to-ad-batch API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 