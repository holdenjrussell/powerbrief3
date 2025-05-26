import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface SaveSlackSettingsRequest {
  brandId: string;
  webhookUrl: string;
  channelName?: string | null;
  notificationsEnabled: boolean;
  channelConfig?: {
    default?: string | null;
    concept_submission?: string | null;
    concept_revision?: string | null;
    concept_approval?: string | null;
    ad_launch?: string | null;
  };
}

interface BrandSlackUpdateData {
  updated_at: string;
  slack_webhook_url: string;
  slack_channel_name?: string | null;
  slack_notifications_enabled: boolean;
  slack_channel_config?: Record<string, string | null>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveSlackSettingsRequest = await request.json();
    const { brandId, webhookUrl, channelName, notificationsEnabled, channelConfig } = body;

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

    // Add channel configuration if provided
    if (channelConfig) {
      updateData.slack_channel_config = {
        default: channelConfig.default?.trim() || null,
        concept_submission: channelConfig.concept_submission?.trim() || null,
        concept_revision: channelConfig.concept_revision?.trim() || null,
        concept_approval: channelConfig.concept_approval?.trim() || null,
        ad_launch: channelConfig.ad_launch?.trim() || null
      };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands' as any)
      .update(updateData)
      .eq('id', brandId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating brand Slack settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update Slack settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Slack settings updated successfully',
      brand: updatedBrand
    });

  } catch (error) {
    console.error('Error in save Slack settings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 