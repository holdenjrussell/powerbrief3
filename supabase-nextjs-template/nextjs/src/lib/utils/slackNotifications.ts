import { createSSRClient } from '@/lib/supabase/server';

interface AdLaunchResult {
  adName: string;
  status: string;
  campaignId: string | null;
  adSetId: string | null;
  adId?: string;
  adError?: string;
}

interface SlackNotificationData {
  brandId: string;
  batchName?: string;
  campaignId?: string | null;
  adSetId?: string | null;
  campaignName?: string;
  adSetName?: string;
  launchedAds: AdLaunchResult[];
  totalAds: number;
  successfulAds: number;
  failedAds: number;
}

export async function sendSlackNotification(data: SlackNotificationData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for Slack notification:', brandError);
      return;
    }

    // Check if Slack notifications are enabled
    if (!brand.slack_notifications_enabled || !brand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Get campaign and ad set names if we have IDs
    let campaignName = data.campaignName || 'Unknown Campaign';
    let adSetName = data.adSetName || 'Unknown Ad Set';

    if (data.campaignId && !data.campaignName) {
      try {
        // In a real implementation, you'd fetch from Meta API
        // For now, we'll use the ID as fallback
        campaignName = `Campaign ${data.campaignId}`;
      } catch (error) {
        console.warn('Could not fetch campaign name:', error);
      }
    }

    if (data.adSetId && !data.adSetName) {
      try {
        // In a real implementation, you'd fetch from Meta API
        // For now, we'll use the ID as fallback
        adSetName = `Ad Set ${data.adSetId}`;
      } catch (error) {
        console.warn('Could not fetch ad set name:', error);
      }
    }

    // Prepare successful ads list
    const successfulAds = data.launchedAds.filter(ad => ad.status === 'AD_CREATED');
    const failedAds = data.launchedAds.filter(ad => ad.status !== 'AD_CREATED');

    // Create Slack message
    const message = createSlackMessage({
      brandName: brand.name,
      batchName: data.batchName,
      campaignName,
      adSetName,
      successfulAds,
      failedAds,
      totalAds: data.totalAds,
      successfulCount: data.successfulAds,
      failedCount: data.failedAds,
      campaignId: data.campaignId,
      adSetId: data.adSetId
    });

    // Add channel override if specified
    if (brand.slack_channel_name) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (message as any).channel = brand.slack_channel_name.startsWith('#') 
        ? brand.slack_channel_name 
        : `#${brand.slack_channel_name}`;
    }

    // Send to Slack
    const response = await fetch(brand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send Slack notification:', response.status, errorText);
    } else {
      console.log('Slack notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

interface SlackMessageData {
  brandName: string;
  batchName?: string;
  campaignName: string;
  adSetName: string;
  successfulAds: AdLaunchResult[];
  failedAds: AdLaunchResult[];
  totalAds: number;
  successfulCount: number;
  failedCount: number;
  campaignId?: string | null;
  adSetId?: string | null;
}

function createSlackMessage(data: SlackMessageData) {
  const {
    brandName,
    batchName,
    campaignName,
    adSetName,
    successfulAds,
    failedAds,
    totalAds,
    successfulCount,
    failedCount,
    campaignId,
    adSetId
  } = data;

  // Create status emoji and color
  const statusEmoji = failedCount === 0 ? '✅' : successfulCount > 0 ? '⚠️' : '❌';
  const statusColor = failedCount === 0 ? 'good' : successfulCount > 0 ? 'warning' : 'danger';
  
  // Create ads manager link if we have campaign and ad set IDs
  let adsManagerLink = '';
  if (campaignId && adSetId) {
    adsManagerLink = `https://www.facebook.com/adsmanager/manage/adsets?act=&selected_adset_id=${adSetId}&selected_campaign_id=${campaignId}`;
  }

  // Build successful ads list
  const successfulAdsList = successfulAds.map(ad => `• ${ad.adName}`).join('\n');
  
  // Build failed ads list
  const failedAdsList = failedAds.length > 0 
    ? failedAds.map(ad => `• ${ad.adName} (${ad.adError || 'Unknown error'})`).join('\n')
    : '';

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${statusEmoji} New Ad Batch Published`,
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Brand:*\n${brandName}`
        },
        {
          type: "mrkdwn",
          text: `*Batch:*\n${batchName || 'Unnamed Batch'}`
        },
        {
          type: "mrkdwn",
          text: `*Campaign:*\n${campaignName}`
        },
        {
          type: "mrkdwn",
          text: `*Ad Set:*\n${adSetName}`
        }
      ]
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Total Ads:*\n${totalAds}`
        },
        {
          type: "mrkdwn",
          text: `*Successful:*\n${successfulCount}`
        },
        {
          type: "mrkdwn",
          text: `*Failed:*\n${failedCount}`
        },
        {
          type: "mrkdwn",
          text: `*Status:*\n${failedCount === 0 ? 'All Success' : successfulCount > 0 ? 'Partial Success' : 'All Failed'}`
        }
      ]
    }
  ];

  // Add successful ads section
  if (successfulAds.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Ads Launched:*\n${successfulAdsList}`
      }
    });
  }

  // Add failed ads section
  if (failedAds.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Failed Ads:*\n${failedAdsList}`
      }
    });
  }

  // Add ads manager link if available
  if (adsManagerLink) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View in Ads Manager",
            emoji: true
          },
          url: adsManagerLink,
          style: "primary"
        }
      ]
    });
  }

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Published at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `${statusEmoji} New Ad Batch Published - ${brandName}`,
    attachments: [
      {
        color: statusColor,
        blocks: blocks
      }
    ]
  };
} 