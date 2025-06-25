import { createSSRClient } from '@/lib/supabase/server';

// Interfaces for UGC notification data
interface UGCScriptApprovedData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorCount: number;
  publicShareLink: string;
  dashboardLink: string;
}

interface UGCScriptRevisionData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  feedback: string;
  publicShareLink: string;
  scriptEditorLink: string;
}

interface UGCScriptRevisionSubmittedData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  revisionCount: number;
  publicShareLink: string;
  reviewDashboardLink: string;
}

interface UGCCreatorAssignedData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  creatorEmail: string;
  creatorStatus: string;
  publicShareLink: string;
  dashboardLink: string;
}

interface UGCScriptResponseData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  response: 'approved' | 'rejected';
  feedback?: string;
  publicShareLink: string;
  dashboardLink: string;
}

interface UGCContentSubmittedData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  contentLinks: string[];
  approvalDashboardLink: string;
  publicShareLink: string;
}

interface UGCContentRevisionData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  feedback: string;
  publicShareLink: string;
  creatorDashboardLink: string;
}

interface UGCContentRevisionSubmittedData {
  brandId: string;
  scriptId: string;
  scriptTitle: string;
  creatorName: string;
  resubmissionCount: number;
  contentLinks: string[];
  approvalDashboardLink: string;
  publicShareLink: string;
}

interface BrandSlackSettings {
  name: string;
  slack_webhook_url: string;
  ugc_slack_channel?: string;
  slack_channel_name?: string;
  slack_notifications_enabled: boolean;
  ugc_slack_notifications_enabled?: boolean;
}

// Helper function to get the appropriate channel for UGC notifications
function getUGCSlackChannel(brand: BrandSlackSettings): string | undefined {
  // First, check if there's a specific UGC channel configured
  if (brand.ugc_slack_channel) {
    return brand.ugc_slack_channel.startsWith('#') 
      ? brand.ugc_slack_channel 
      : `#${brand.ugc_slack_channel}`;
  }
  
  // Fall back to the general channel name
  if (brand.slack_channel_name) {
    return brand.slack_channel_name.startsWith('#') 
      ? brand.slack_channel_name 
      : `#${brand.slack_channel_name}`;
  }
  
  // No channel override - use webhook default
  return undefined;
}

// Helper function to format links in Slack
function formatSlackLink(url: string, text: string): string {
  return `<${url}|${text}>`;
}

// 1. Script approved and ready for creator assignment
export async function sendUGCScriptApprovedNotification(data: UGCScriptApprovedData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    // Get brand Slack settings
    // Using 'as any' because ugc_slack_channel columns don't exist until migration is run
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC script approved notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    // Check if UGC Slack notifications are enabled
    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Create Slack message
    const message = {
      text: `🎬 UGC Pipeline: Script Approved`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎬 UGC Pipeline: Script Approved',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Available Creators:*\n${data.creatorCount} creators`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n✅ Ready for assignment`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'The script has been approved and is now ready for creator assignment.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Assign Creators',
                emoji: true
              },
              url: data.dashboardLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Approved at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    // Add channel override if configured
    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
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
      console.error('Failed to send UGC script approved notification:', response.status, errorText);
    } else {
      console.log('UGC script approved notification sent successfully for brand:', data.brandId);
    }

  } catch (error) {
    console.error('Error sending UGC script approved notification:', error);
  }
}

// 2. Script revisions requested
export async function sendUGCScriptRevisionNotification(data: UGCScriptRevisionData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC script revision notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `📝 UGC Pipeline: Script Revisions Requested`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📝 UGC Pipeline: Script Revisions Requested',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n🔄 Revisions needed`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Feedback:*\n${data.feedback}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Edit Script',
                emoji: true
              },
              url: data.scriptEditorLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Revision requested at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC script revision notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC script revision notification:', error);
  }
}

// 3. Script revision submitted
export async function sendUGCScriptRevisionSubmittedNotification(data: UGCScriptRevisionSubmittedData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC script revision submitted notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `✏️ UGC Pipeline: Script Revision Submitted`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✏️ UGC Pipeline: Script Revision Submitted',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle} (Revision ${data.revisionCount})`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n📝 Under review`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Script revision has been submitted and is ready for review.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review Script',
                emoji: true
              },
              url: data.reviewDashboardLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Public Share',
                emoji: true
              },
              url: data.publicShareLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submitted at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC script revision submitted notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC script revision submitted notification:', error);
  }
}

// 4. Creator assigned to script
export async function sendUGCCreatorAssignedNotification(data: UGCCreatorAssignedData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC creator assigned notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `👤 UGC Pipeline: Creator Assigned`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '👤 UGC Pipeline: Creator Assigned',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${data.creatorEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Contract Status:*\n${data.creatorStatus}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Brand:* ${typedBrand.name}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard',
                emoji: true
              },
              url: data.dashboardLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Assigned at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC creator assigned notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC creator assigned notification:', error);
  }
}

// 5. Creator approves/rejects script
export async function sendUGCScriptResponseNotification(data: UGCScriptResponseData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC script response notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const emoji = data.response === 'approved' ? '✅' : '❌';
    const status = data.response === 'approved' ? 'Approved' : 'Rejected';

    const message: any = {
      text: `${emoji} UGC Pipeline: Script ${status} by Creator`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} UGC Pipeline: Script ${status} by Creator`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Response:*\n${emoji} ${status}`
            }
          ]
        }
      ]
    };

    // Add feedback section if provided
    if (data.feedback) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Creator Feedback:*\n${data.feedback}`
        }
      });
    }

    // Add actions
    message.blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Script',
            emoji: true
          },
          url: data.publicShareLink,
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Dashboard',
            emoji: true
          },
          url: data.dashboardLink
        }
      ]
    });

    // Add context
    message.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${status} at ${new Date().toLocaleString()}`
        }
      ]
    });

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      message.channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC script response notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC script response notification:', error);
  }
}

// 6. Content submitted for approval
export async function sendUGCContentSubmittedNotification(data: UGCContentSubmittedData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC content submitted notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `🎥 UGC Pipeline: Content Submitted for Approval`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎥 UGC Pipeline: Content Submitted for Approval',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Content Count:*\n${data.contentLinks.length} files`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Content Links:*\n${data.contentLinks.map((link, index) => `${index + 1}. ${formatSlackLink(link, `Content ${index + 1}`)}`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review Content',
                emoji: true
              },
              url: data.approvalDashboardLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Submitted at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC content submitted notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC content submitted notification:', error);
  }
}

// 7. Content revisions requested
export async function sendUGCContentRevisionNotification(data: UGCContentRevisionData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC content revision notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `🔄 UGC Pipeline: Content Revisions Requested`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 UGC Pipeline: Content Revisions Requested',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n🔄 Revisions needed`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Feedback:*\n${data.feedback}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Creator Dashboard',
                emoji: true
              },
              url: data.creatorDashboardLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Revision requested at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC content revision notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC content revision notification:', error);
  }
}

// 8. Content revision submitted
export async function sendUGCContentRevisionSubmittedNotification(data: UGCContentRevisionSubmittedData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC content revision submitted notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    const message = {
      text: `🎬 UGC Pipeline: Content Revision Submitted`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎬 UGC Pipeline: Content Revision Submitted',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Script:*\n${data.scriptTitle} (Resubmission ${data.resubmissionCount})`
            },
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Content Count:*\n${data.contentLinks.length} files`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Content Links:*\n${data.contentLinks.map((link, index) => `${index + 1}. ${formatSlackLink(link, `Content ${index + 1}`)}`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review Content',
                emoji: true
              },
              url: data.approvalDashboardLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Script',
                emoji: true
              },
              url: data.publicShareLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Resubmitted at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC content revision submitted notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC content revision submitted notification:', error);
  }
}

// Test notification for settings page
export async function sendUGCTestNotification(brandId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC test notification:', brandError);
      return { success: false, error: 'Failed to fetch brand settings' };
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.slack_webhook_url) {
      return { success: false, error: 'No Slack webhook URL configured' };
    }

    const message = {
      text: `🧪 UGC Pipeline: Test Notification`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 UGC Pipeline: Test Notification',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `This is a test notification from *${typedBrand.name}* to verify your UGC Slack integration is working correctly.`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Brand:*\n${typedBrand.name}`
            },
            {
              type: 'mrkdwn',
              text: `*UGC Notifications:*\n${typedBrand.ugc_slack_notifications_enabled ? '✅ Enabled' : '❌ Disabled'}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:*\n${getUGCSlackChannel(typedBrand) || 'Default webhook channel'}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${new Date().toLocaleString()}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'If you see this message, your UGC Pipeline Slack integration is configured correctly! 🎉'
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC test notification:', response.status, errorText);
      return { success: false, error: `Slack API error: ${response.status} ${errorText}` };
    }

    return { success: true };

  } catch (error) {
    console.error('Error sending UGC test notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 9. Creator status change notification
export interface UGCCreatorStatusData {
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  previousStatus: string;
  newStatus: string;
  creatorDashboardLink: string;
  pipelineDashboardLink: string;
}

export async function sendUGCCreatorStatusNotification(data: UGCCreatorStatusData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC creator status notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Determine emoji and color based on status
    let emoji = '📋';
    let color = '#1f2937'; // gray
    
    if (data.newStatus === 'Approved for next steps') {
      emoji = '✅';
      color = '#10b981'; // green
    } else if (data.newStatus === 'Ready for scripts') {
      emoji = '🎬';
      color = '#3b82f6'; // blue
    } else if (data.newStatus === 'Rejected') {
      emoji = '❌';
      color = '#ef4444'; // red
    }

    const message = {
      text: `${emoji} UGC Pipeline: Creator Status Updated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} UGC Pipeline: Creator Status Updated`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${data.creatorEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Previous Status:*\n${data.previousStatus}`
            },
            {
              type: 'mrkdwn',
              text: `*New Status:*\n${data.newStatus}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Brand:* ${typedBrand.name}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Creator',
                emoji: true
              },
              url: data.creatorDashboardLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Pipeline',
                emoji: true
              },
              url: data.pipelineDashboardLink
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Updated at ${new Date().toLocaleString()}`
            }
          ]
        }
      ],
      attachments: [{
        color: color
      }]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC creator status notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC creator status notification:', error);
  }
}

// 10. Contract status change notification
export interface UGCContractStatusData {
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  previousStatus: string;
  newStatus: string;
  creatorDashboardLink: string;
  pipelineDashboardLink: string;
}

export async function sendUGCContractStatusNotification(data: UGCContractStatusData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC contract status notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Determine emoji based on status
    let emoji = '📄';
    if (data.newStatus === 'contract sent') {
      emoji = '📨';
    } else if (data.newStatus === 'contract signed') {
      emoji = '✍️';
    }

    const message = {
      text: `${emoji} UGC Pipeline: Contract Status Updated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} UGC Pipeline: Contract Status Updated`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${data.creatorEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Previous Status:*\n${data.previousStatus}`
            },
            {
              type: 'mrkdwn',
              text: `*New Status:*\n${data.newStatus}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Brand:* ${typedBrand.name}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Creator',
                emoji: true
              },
              url: data.creatorDashboardLink,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Contracts',
                emoji: true
              },
              url: `${data.pipelineDashboardLink}&view=contracts`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Updated at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      (message as any).channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC contract status notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC contract status notification:', error);
  }
}

// 11. Product shipment status change notification
export interface UGCProductShipmentData {
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  previousStatus: string;
  newStatus: string;
  trackingNumber?: string;
  creatorDashboardLink: string;
  pipelineDashboardLink: string;
}

export async function sendUGCProductShipmentNotification(data: UGCProductShipmentData): Promise<void> {
  try {
    const supabase = await createSSRClient();
    
    const { data: brand, error: brandError } = await supabase
      .from('brands' as any)
      .select('name, slack_webhook_url, ugc_slack_channel, slack_channel_name, slack_notifications_enabled, ugc_slack_notifications_enabled')
      .eq('id', data.brandId)
      .single();

    if (brandError || !brand) {
      console.error('Error fetching brand for UGC product shipment notification:', brandError);
      return;
    }

    const typedBrand = brand as unknown as BrandSlackSettings;

    if (!typedBrand.ugc_slack_notifications_enabled || !typedBrand.slack_webhook_url) {
      console.log('UGC Slack notifications not enabled for brand:', data.brandId);
      return;
    }

    // Determine emoji based on status
    let emoji = '📦';
    if (data.newStatus === 'Shipped') {
      emoji = '🚚';
    } else if (data.newStatus === 'Delivered') {
      emoji = '✅';
    } else if (data.newStatus === 'Processing') {
      emoji = '⏳';
    }

    const message: any = {
      text: `${emoji} UGC Pipeline: Product Shipment Status Updated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} UGC Pipeline: Product Shipment Status Updated`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Creator:*\n${data.creatorName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${data.creatorEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Previous Status:*\n${data.previousStatus}`
            },
            {
              type: 'mrkdwn',
              text: `*New Status:*\n${data.newStatus}`
            }
          ]
        }
      ]
    };

    // Add tracking number if provided
    if (data.trackingNumber) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Tracking Number:* ${data.trackingNumber}`
        }
      });
    }

    // Add brand info
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Brand:* ${typedBrand.name}`
      }
    });

    // Add actions
    message.blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Creator',
            emoji: true
          },
          url: data.creatorDashboardLink,
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Pipeline',
            emoji: true
          },
          url: data.pipelineDashboardLink
        }
      ]
    });

    // Add context
    message.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Updated at ${new Date().toLocaleString()}`
        }
      ]
    });

    const channelOverride = getUGCSlackChannel(typedBrand);
    if (channelOverride) {
      message.channel = channelOverride;
    }

    const response = await fetch(typedBrand.slack_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send UGC product shipment notification:', response.status, errorText);
    }

  } catch (error) {
    console.error('Error sending UGC product shipment notification:', error);
  }
}