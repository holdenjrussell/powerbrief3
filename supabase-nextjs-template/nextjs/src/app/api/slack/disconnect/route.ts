import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface DisconnectSlackRequest {
  brandId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DisconnectSlackRequest = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    // Clear all Slack-related fields for the brand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await supabase
      .from('brands' as any)
      .update({
        slack_webhook_url: null,
        slack_channel_name: null,
        slack_notifications_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Error disconnecting Slack from brand:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect Slack integration' },
        { status: 500 }
      );
    }

    console.log('Successfully disconnected Slack from brand:', brandId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Slack integration disconnected successfully'
    });

  } catch (error) {
    console.error('Error in Slack disconnect API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 