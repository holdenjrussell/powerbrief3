import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface SaveSlackSettingsRequest {
  brandId: string;
  webhookUrl: string;
  channelName?: string | null;
  notificationsEnabled: boolean;
}

interface BrandSlackUpdateData {
  updated_at: string;
  slack_webhook_url: string;
  slack_channel_name?: string | null;
  slack_notifications_enabled: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveSlackSettingsRequest = await request.json();
    const { brandId, webhookUrl, channelName, notificationsEnabled } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    if (!webhookUrl || !webhookUrl.trim()) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL format' },
        { status: 400 }
      );
    }

    const supabase = await createSSRClient();

    // Check if brand exists and user has access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: fetchError } = await supabase
      .from('brands' as any)
      .select('id')
      .eq('id', brandId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching brand for Slack settings update:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch brand' }, 
        { status: 500 }
      );
    }

    if (!brand && !fetchError) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Update brand with Slack settings
    const updateData: BrandSlackUpdateData = {
      slack_webhook_url: webhookUrl.trim(),
      slack_channel_name: channelName?.trim() || null,
      slack_notifications_enabled: notificationsEnabled,
      updated_at: new Date().toISOString()
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands' as any)
      .update(updateData)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError || !updatedBrand) {
      console.error('Error updating brand with Slack settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update brand with Slack settings' },
        { status: 500 }
      );
    }

    console.log('Successfully updated Slack settings for brand:', brandId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Slack settings saved successfully',
      brand: updatedBrand
    });

  } catch (error) {
    console.error('Error in Slack save-settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 