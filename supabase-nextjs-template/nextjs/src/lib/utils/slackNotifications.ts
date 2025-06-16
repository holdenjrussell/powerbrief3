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

// New interfaces for concept notifications
interface ConceptSubmissionData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  reviewLink?: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
  hasUploadedAssets: boolean;
}

interface ConceptRevisionData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  feedback: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
}

interface ConceptApprovalData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  reviewerNotes?: string;
  publicShareUrl: string;
  uploadToolUrl: string;
}

interface ConceptReadyForEditorData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  assignedEditor?: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

interface BriefRevisionsNeededData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  briefRevisionComments?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

interface ConceptRejectionData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  rejectionComments?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

interface AdditionalSizesRequestData {
  brandId: string;
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  additionalSizesNotes: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
}

interface BrandSlackSettings {
  name: string;
  slack_webhook_url: string;
  slack_channel_name?: string;
  slack_notifications_enabled: boolean;
  slack_channel_config?: {
    default?: string;
    concept_submission?: string;
    concept_revision?: string;
    concept_approval?: string;
    concept_ready_for_editor?: string;
    ad_launch?: string;
  };
}

// Helper function to get the appropriate channel for a notification type
function getChannelForNotificationType(
  brand: BrandSlackSettings, 
  notificationType: 'concept_submission' | 'concept_revision' | 'concept_approval' | 'concept_ready_for_editor' | 'ad_launch'
): string | undefined {
  const channelConfig = brand.slack_channel_config || {};
  
  // DEBUG: Log the channel configuration lookup
  console.log('DEBUG - getChannelForNotificationType:', {
    notificationType,
    channelConfig,
    brandName: brand.name
  });
  
  // First, try to get the specific channel for this notification type
  const specificChannel = channelConfig[notificationType];
  console.log('DEBUG - Specific channel found:', specificChannel);
  
  if (specificChannel) {
    const formattedChannel = specificChannel.startsWith('#') ? specificChannel : `#${specificChannel}`;
    console.log('DEBUG - Returning formatted specific channel:', formattedChannel);
    return formattedChannel;
  }
  
  // Fall back to the default channel from config
  const defaultChannel = channelConfig.default;
  console.log('DEBUG - Default channel from config:', defaultChannel);
  
  if (defaultChannel) {
    const formattedDefault = defaultChannel.startsWith('#') ? defaultChannel : `#${defaultChannel}`;
    console.log('DEBUG - Returning formatted default channel:', formattedDefault);
    return formattedDefault;
  }
  
  // Fall back to the legacy channel name field
  if (brand.slack_channel_name) {
    const legacyChannel = brand.slack_channel_name.startsWith('#') 
      ? brand.slack_channel_name 
      : `#${brand.slack_channel_name}`;
    console.log('DEBUG - Returning legacy channel:', legacyChannel);
    return legacyChannel;
  }
  
  // No channel override - use webhook default
  console.log('DEBUG - No channel override found, using webhook default');
  return undefined;
}

export async function sendSlackNotification(data: SlackNotificationData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for Slack notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
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
    const successfulAds = data.launchedAds?.filter(ad => ad.status === 'PUBLISHED') || [];
    const failedAds = data.launchedAds?.filter(ad => ad.status !== 'PUBLISHED') || [];

    // Create Slack message
    const message = createSlackMessage({
      brandName: typedBrand.name,
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

    // Add channel override for ad launch notifications
    const channelOverride = getChannelForNotificationType(typedBrand, 'ad_launch');
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
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

// New function for concept submission notifications
export async function sendConceptSubmissionNotification(data: ConceptSubmissionData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for concept submission notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for concept submission
    const message = createConceptSubmissionMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      videoEditor: data.videoEditor,
      reviewLink: data.reviewLink,
      publicShareUrl: data.publicShareUrl,
      reviewDashboardUrl: data.reviewDashboardUrl,
      hasUploadedAssets: data.hasUploadedAssets
    });

    // Add channel override for concept submission notifications
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_submission');
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send concept submission notification:', response.status, errorText);
    } else {
      console.log('Concept submission notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending concept submission notification:', error);
  }
}

// New function for concept revision notifications
export async function sendConceptRevisionNotification(data: ConceptRevisionData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for concept revision notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for concept revision
    const message = createConceptRevisionMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      videoEditor: data.videoEditor,
      feedback: data.feedback,
      publicShareUrl: data.publicShareUrl,
      reviewDashboardUrl: data.reviewDashboardUrl
    });

    // Add channel override for concept revision notifications
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_revision');
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send concept revision notification:', response.status, errorText);
    } else {
      console.log('Concept revision notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending concept revision notification:', error);
  }
}

// New function for concept approval notifications
export async function sendConceptApprovalNotification(data: ConceptApprovalData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for concept approval notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for concept approval
    const message = createConceptApprovalMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      videoEditor: data.videoEditor,
      reviewerNotes: data.reviewerNotes,
      publicShareUrl: data.publicShareUrl,
      uploadToolUrl: data.uploadToolUrl
    });

    // Add channel override for concept approval notifications
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_approval');
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send concept approval notification:', response.status, errorText);
    } else {
      console.log('Concept approval notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending concept approval notification:', error);
  }
}

// New function for concept ready for editor notifications
export async function sendConceptReadyForEditorNotification(data: ConceptReadyForEditorData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for concept ready for editor notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // DEBUG: Log the brand slack configuration
    console.log('DEBUG - Brand Slack Config for concept ready for editor:', {
      brandId: data.brandId,
      brandName: typedBrand.name,
      slack_channel_config: typedBrand.slack_channel_config,
      slack_channel_name: typedBrand.slack_channel_name
    });

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for concept ready for editor
    const message = createConceptReadyForEditorMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      assignedEditor: data.assignedEditor,
      assignedStrategist: data.assignedStrategist,
      assignedCreativeCoordinator: data.assignedCreativeCoordinator,
      conceptShareUrl: data.conceptShareUrl,
      batchShareUrl: data.batchShareUrl
    });

    // Add channel override for concept ready for editor notifications
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_ready_for_editor');
    
    // DEBUG: Log the channel override result
    console.log('DEBUG - Channel override for concept_ready_for_editor:', {
      channelOverride,
      originalMessage: message
    });
    
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
      console.log('DEBUG - Message with channel override applied:', message);
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send concept ready for editor notification:', response.status, errorText);
    } else {
      console.log('Concept ready for editor notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending concept ready for editor notification:', error);
  }
}

// New function for brief revisions needed notifications
export async function sendBriefRevisionsNeededNotification(data: BriefRevisionsNeededData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for brief revisions needed notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for brief revisions needed
    const message = createBriefRevisionsNeededMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      assignedStrategist: data.assignedStrategist,
      assignedCreativeCoordinator: data.assignedCreativeCoordinator,
      briefRevisionComments: data.briefRevisionComments,
      conceptShareUrl: data.conceptShareUrl,
      batchShareUrl: data.batchShareUrl
    });

    // Add channel override for concept revision notifications (similar category)
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_revision');
    
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send brief revisions needed notification:', response.status, errorText);
    } else {
      console.log('Brief revisions needed notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending brief revisions needed notification:', error);
  }
}

// New function for concept rejection notifications
export async function sendConceptRejectionNotification(data: ConceptRejectionData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for concept rejection notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for concept rejection
    const message = createConceptRejectionMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      assignedStrategist: data.assignedStrategist,
      assignedCreativeCoordinator: data.assignedCreativeCoordinator,
      rejectionComments: data.rejectionComments,
      conceptShareUrl: data.conceptShareUrl,
      batchShareUrl: data.batchShareUrl
    });

    // Add channel override for concept revision notifications (similar category)
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_revision');
    
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send concept rejection notification:', response.status, errorText);
    } else {
      console.log('Concept rejection notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending concept rejection notification:', error);
  }
}

// New function for additional sizes request notifications
export async function sendAdditionalSizesRequestNotification(data: AdditionalSizesRequestData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, slack_channel_name, slack_notifications_enabled, slack_channel_config')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for additional sizes request notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if Slack notifications are enabled
    if (!typedBrand.slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message for additional sizes request
    const message = createAdditionalSizesRequestMessage({
      brandName: typedBrand.name,
      conceptTitle: data.conceptTitle,
      batchName: data.batchName,
      videoEditor: data.videoEditor,
      additionalSizesNotes: data.additionalSizesNotes,
      publicShareUrl: data.publicShareUrl,
      reviewDashboardUrl: data.reviewDashboardUrl
    });

    // Add channel override for concept revision notifications (similar category)
    const channelOverride = getChannelForNotificationType(typedBrand, 'concept_revision');
    if (channelOverride) {
      (message as { channel?: string }).channel = channelOverride;
    }

    // Send to Slack
    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send additional sizes request notification:', response.status, errorText);
    } else {
      console.log('Additional sizes request notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending additional sizes request notification:', error);
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

// New message creation functions for concept notifications
interface ConceptSubmissionMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  reviewLink?: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
  hasUploadedAssets: boolean;
}

function createConceptSubmissionMessage(data: ConceptSubmissionMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    videoEditor,
    reviewLink,
    publicShareUrl,
    reviewDashboardUrl,
    hasUploadedAssets
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📝 New Concept Submitted for Review",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Creator:*\n${videoEditor || 'Not assigned'}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Content Type:*\n${hasUploadedAssets ? '📁 Uploaded Assets' : '🔗 Frame.io Link'}`
      }
    }
  ];

  // Add Frame.io link if available
  if (reviewLink && !hasUploadedAssets) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Frame.io Link:*\n<${reviewLink}|View on Frame.io>`
      }
    });
  }

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Public Share",
          emoji: true
        },
        url: publicShareUrl,
        style: "primary"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Review & Approve",
          emoji: true
        },
        url: reviewDashboardUrl
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Submitted at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `📝 New Concept Submitted - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "warning",
        blocks: blocks
      }
    ]
  };
}

interface ConceptRevisionMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  feedback: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
}

function createConceptRevisionMessage(data: ConceptRevisionMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    videoEditor,
    feedback,
    publicShareUrl,
    reviewDashboardUrl
  } = data;

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔄 Concept Revisions Requested",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Creator:*\n${videoEditor || 'Not assigned'}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Feedback:*\n${feedback}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Next Steps:*\nPlease review the feedback, make the requested changes, and resubmit the concept for review."
      }
    }
  ];

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View & Revise",
          emoji: true
        },
        url: publicShareUrl,
        style: "primary"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Review Dashboard (Admin)",
          emoji: true
        },
        url: reviewDashboardUrl
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Revisions requested at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `🔄 Revisions Requested - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "danger",
        blocks: blocks
      }
    ]
  };
}

interface ConceptApprovalMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  reviewerNotes?: string;
  publicShareUrl: string;
  uploadToolUrl: string;
}

function createConceptApprovalMessage(data: ConceptApprovalMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    videoEditor,
    reviewerNotes,
    publicShareUrl,
    uploadToolUrl
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Concept Approved!",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Creator:*\n${videoEditor || 'Not assigned'}`
        }
      ]
    }
  ];

  // Add reviewer notes if available
  if (reviewerNotes) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reviewer Notes:*\n${reviewerNotes}`
      }
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Status:* ✅ Ready for Meta upload via the Ad Upload Tool"
    }
  });

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Concept",
          emoji: true
        },
        url: publicShareUrl
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Upload to Meta",
          emoji: true
        },
        url: uploadToolUrl,
        style: "primary"
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Approved at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `✅ Concept Approved - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "good",
        blocks: blocks
      }
    ]
  };
}

// New function for concept ready for editor notifications
interface ConceptReadyForEditorMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  assignedEditor?: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

function createConceptReadyForEditorMessage(data: ConceptReadyForEditorMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    assignedEditor,
    assignedStrategist,
    assignedCreativeCoordinator,
    conceptShareUrl,
    batchShareUrl
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Concept Ready for Editor",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Assigned Editor:*\n${assignedEditor || 'Not assigned'}`
        },
        {
          type: "mrkdwn",
          text: `*Assigned Strategist:*\n${assignedStrategist || 'Not assigned'}`
        },
        {
          type: "mrkdwn",
          text: `*Assigned Creative Coordinator:*\n${assignedCreativeCoordinator || 'Not assigned'}`
        }
      ]
    }
  ];

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Concept",
          emoji: true
        },
        url: conceptShareUrl
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Batch",
          emoji: true
        },
        url: batchShareUrl
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Ready for editor at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `✅ Concept Ready for Editor - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "good",
        blocks: blocks
      }
    ]
  };
}

// New function for brief revisions needed notifications
interface BriefRevisionsNeededMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  briefRevisionComments?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

function createBriefRevisionsNeededMessage(data: BriefRevisionsNeededMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    assignedStrategist,
    assignedCreativeCoordinator,
    briefRevisionComments,
    conceptShareUrl,
    batchShareUrl
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔄 Brief Revisions Needed",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Assigned Strategist:*\n${assignedStrategist || 'Not assigned'}`
        }
      ]
    }
  ];

  // Add creative coordinator field if available
  if (assignedCreativeCoordinator) {
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*Creative Coordinator:*\n${assignedCreativeCoordinator}`
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Status:* 🔄 The brief requires revisions before proceeding to production. Please review and update the concept brief."
    }
  });

  // Add comments section if provided
  if (briefRevisionComments) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Revision Comments:*\n${briefRevisionComments}`
      }
    });
  }

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Concept",
          emoji: true
        },
        url: conceptShareUrl
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Batch",
          emoji: true
        },
        url: batchShareUrl,
        style: "primary"
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Brief revisions requested at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `🔄 Brief Revisions Needed - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "warning",
        blocks: blocks
      }
    ]
  };
}

// New function for concept rejection notifications
interface ConceptRejectionMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  assignedStrategist?: string;
  assignedCreativeCoordinator?: string;
  rejectionComments?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

function createConceptRejectionMessage(data: ConceptRejectionMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    assignedStrategist,
    assignedCreativeCoordinator,
    rejectionComments,
    conceptShareUrl,
    batchShareUrl
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "❌ Concept Rejected",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Assigned Strategist:*\n${assignedStrategist || 'Not assigned'}`
        }
      ]
    }
  ];

  // Add creative coordinator field if available
  if (assignedCreativeCoordinator) {
    blocks[1].fields.push({
      type: "mrkdwn",
      text: `*Creative Coordinator:*\n${assignedCreativeCoordinator}`
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Status:* ❌ This concept has been rejected and will not proceed to production. The concept may need to be completely reworked or replaced."
    }
  });

  // Add rejection comments section if provided
  if (rejectionComments) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Rejection Comments:*\n${rejectionComments}`
      }
    });
  }

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Concept",
          emoji: true
        },
        url: conceptShareUrl
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Batch",
          emoji: true
        },
        url: batchShareUrl,
        style: "danger"
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Concept rejected at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `❌ Concept Rejected - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "danger",
        blocks: blocks
      }
    ]
  };
}

// New function for additional sizes request notifications
interface AdditionalSizesRequestMessageData {
  brandName: string;
  conceptTitle: string;
  batchName: string;
  videoEditor?: string;
  additionalSizesNotes: string;
  publicShareUrl: string;
  reviewDashboardUrl: string;
}

function createAdditionalSizesRequestMessage(data: AdditionalSizesRequestMessageData) {
  const {
    brandName,
    conceptTitle,
    batchName,
    videoEditor,
    additionalSizesNotes,
    publicShareUrl,
    reviewDashboardUrl
  } = data;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📐 Additional Sizes Request",
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
          text: `*Batch:*\n${batchName}`
        },
        {
          type: "mrkdwn",
          text: `*Concept:*\n${conceptTitle}`
        },
        {
          type: "mrkdwn",
          text: `*Creator:*\n${videoEditor || 'Not assigned'}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Additional Sizes Notes:*\n${additionalSizesNotes}`
      }
    }
  ];

  // Add action buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Public Share",
          emoji: true
        },
        url: publicShareUrl
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Review & Approve",
          emoji: true
        },
        url: reviewDashboardUrl
      }
    ]
  });

  // Add timestamp
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Requested at ${new Date().toLocaleString()}`
      }
    ]
  });

  return {
    text: `📐 Additional Sizes Request - ${conceptTitle} (${brandName})`,
    attachments: [
      {
        color: "warning",
        blocks: blocks
      }
    ]
  };
} 