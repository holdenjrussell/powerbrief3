import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    // Await params for Next.js 15 compatibility
    const { shareId } = await params;
    console.log('API called with shareId:', shareId);

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    console.log('Querying concepts with share_settings...');

    // Find the concept with this shareId in its share_settings
    const { data: conceptData, error: conceptError } = await supabaseAdmin
      .from('brief_concepts' as any)
      .select(`
        *,
        brief_batches!inner (
          id,
          name,
          brand_id,
          brands!inner (
            id,
            name,
            brand_info_data,
            target_audience_data,
            competition_data,
            editing_resources,
            resource_logins,
            dos_and_donts
          )
        )
      `)
      .contains('share_settings', { [shareId]: {} });

    console.log('Query result:', { conceptData, conceptError });

    if (conceptError) {
      console.error('Error fetching shared concept:', conceptError);
      return NextResponse.json(
        { error: 'Failed to fetch shared concept' },
        { status: 500 }
      );
    }

    if (!conceptData || conceptData.length === 0) {
      return NextResponse.json(
        { error: 'Shared concept not found or has expired' },
        { status: 404 }
      );
    }

    const concept = conceptData[0] as any;
    const shareSettings = concept.share_settings?.[shareId];
    
    if (!shareSettings) {
      return NextResponse.json(
        { error: 'Share settings not found' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareSettings.expires_at && new Date(shareSettings.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This shared link has expired' },
        { status: 410 }
      );
    }

    // Return the concept data with share settings
    return NextResponse.json({
      concept,
      shareSettings,
      isEditable: !!shareSettings.is_editable
    });

  } catch (error) {
    console.error('Error in public concept API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 